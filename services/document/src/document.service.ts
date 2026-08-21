import { Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { PgService, PgOutboxStore, assertGrantedScope } from "@vertofi/nest-common";
import { toOutboxEnvelope } from "@vertofi/events";
import { setRlsContext, type EffectiveScope, type Principal } from "@vertofi/tenancy";
import { StorageConnector } from "./storage.connector.js";

function scopeFor(principal: Principal, orgId: string): EffectiveScope {
  if (principal.role === "ADMIN") return { orgIds: "*", permission: "EDIT", scope: "FULL" };
  return { orgIds: [orgId], permission: "EDIT", scope: "FULL" };
}

interface DocRow {
  id: string;
  org_id: string;
  s3_key: string;
  version: number;
  status: string;
  type: string;
  filename: string;
}

@Injectable()
export class DocumentService {
  private readonly outbox: PgOutboxStore;

  constructor(
    private readonly pg: PgService,
    private readonly storage: StorageConnector,
  ) {
    this.outbox = new PgOutboxStore(pg, "document");
  }

  /** Status of the storage connector — drives UI empty/activation state (docs/09). */
  storageStatus() {
    return { connector: this.storage.meta.id, status: this.storage.status() };
  }

  /** Vault listing for the Documents module — newest first. */
  async list(principal: Principal, orgId: string) {
    return this.pg.transaction(async (client) => {
      await setRlsContext(client, principal, await assertGrantedScope(client, principal, orgId, "VIEW"));
      const r = await client.query(
        `SELECT id, type, filename, content_type, status, created_at
           FROM document.documents WHERE org_id=$1 ORDER BY created_at DESC LIMIT 200`,
        [orgId],
      );
      return r.rows;
    });
  }

  /** Create a PENDING document row + return a presigned upload URL. */
  async presign(principal: Principal, orgId: string, type: string, filename: string, contentType: string) {
    if (this.storage.status() !== "ACTIVE") {
      throw new ServiceUnavailableException({ code: "storage_not_configured", status: this.storage.status() });
    }
    return this.pg.transaction(async (client) => {
      await setRlsContext(client, principal, await assertGrantedScope(client, principal, orgId, "VIEW"));
      const ins = await client.query<DocRow>(
        `INSERT INTO document.documents (org_id, type, filename, content_type, s3_key, uploaded_by)
         VALUES ($1,$2,$3,$4,'',$5) RETURNING *`,
        [orgId, type, filename, contentType, principal.userId],
      );
      const doc = ins.rows[0]!;
      const key = this.storage.buildKey(orgId, doc.id, doc.version, filename);
      await client.query("UPDATE document.documents SET s3_key = $2 WHERE id = $1", [doc.id, key]);
      const url = await this.storage.presignPut(key, contentType);
      return { documentId: doc.id, uploadUrl: url, key };
    });
  }

  /** Finalize after the client PUTs the file: mark UPLOADED + emit document.received. */
  async commit(principal: Principal, orgId: string, documentId: string) {
    return this.pg.transaction(async (client) => {
      await setRlsContext(client, principal, await assertGrantedScope(client, principal, orgId, "VIEW"));
      const res = await client.query<DocRow>(
        "UPDATE document.documents SET status='UPLOADED', updated_at=now() WHERE id=$1 AND org_id=$2 RETURNING *",
        [documentId, orgId],
      );
      const doc = res.rows[0];
      if (!doc) throw new NotFoundException("document_not_found");

      // Transactional outbox: event persisted in the same tx (docs/18).
      const env = toOutboxEnvelope({
        event: "document.received",
        org_id: orgId,
        actor_id: principal.userId,
        data: { document_id: doc.id, s3_key: doc.s3_key, type: doc.type, source: "WEB" },
      });
      await this.outbox.enqueue(client, env);
      return { documentId: doc.id, status: "UPLOADED" };
    });
  }

  // ── Professional KYC documents (user-scoped, no org) ─────────────────
  /** Create a PENDING KYC doc row for the signed-in professional + presigned PUT. */
  async presignKyc(principal: Principal, type: string, filename: string, contentType: string) {
    if (this.storage.status() !== "ACTIVE") {
      throw new ServiceUnavailableException({ code: "storage_not_configured", status: this.storage.status() });
    }
    const ins = await this.pg.query<{ id: string }>(
      `INSERT INTO document.kyc_documents (user_id, type, filename, content_type)
       VALUES ($1,$2,$3,$4) RETURNING id`,
      [principal.userId, type, filename, contentType],
    );
    const id = ins[0]!.id;
    const key = `kyc/${principal.userId}/${id}/${filename}`;
    await this.pg.query("UPDATE document.kyc_documents SET s3_key=$2 WHERE id=$1", [id, key]);
    const url = await this.storage.presignPut(key, contentType);
    return { documentId: id, uploadUrl: url, key };
  }

  /** Mark a KYC doc UPLOADED after the client PUTs the file. */
  async commitKyc(principal: Principal, documentId: string) {
    const res = await this.pg.query<{ id: string; type: string; filename: string }>(
      "UPDATE document.kyc_documents SET status='UPLOADED', updated_at=now() WHERE id=$1 AND user_id=$2 RETURNING id, type, filename",
      [documentId, principal.userId],
    );
    if (!res[0]) throw new NotFoundException("document_not_found");
    return { documentId: res[0].id, type: res[0].type, filename: res[0].filename, status: "UPLOADED" };
  }

  /** List a professional's KYC docs — the owner sees their own; ADMIN sees anyone's. */
  async listKyc(principal: Principal, userId: string) {
    if (principal.role !== "ADMIN" && principal.userId !== userId) throw new NotFoundException("not_found");
    return this.pg.query(
      "SELECT id, type, filename, content_type, status, created_at FROM document.kyc_documents WHERE user_id=$1 ORDER BY created_at DESC",
      [userId],
    );
  }

  /** ADMIN: presigned read URL for a KYC document (verification review). */
  async downloadKyc(principal: Principal, documentId: string) {
    const rows = await this.pg.query<{ s3_key: string; user_id: string }>(
      "SELECT s3_key, user_id FROM document.kyc_documents WHERE id=$1", [documentId]);
    const doc = rows[0];
    if (!doc) throw new NotFoundException("document_not_found");
    if (principal.role !== "ADMIN" && principal.userId !== doc.user_id) throw new NotFoundException("not_found");
    return { url: await this.storage.presignGet(doc.s3_key) };
  }

  async download(principal: Principal, orgId: string, documentId: string) {
    return this.pg.transaction(async (client) => {
      await setRlsContext(client, principal, await assertGrantedScope(client, principal, orgId, "VIEW"));
      const res = await client.query<DocRow>(
        "SELECT * FROM document.documents WHERE id=$1 AND org_id=$2",
        [documentId, orgId],
      );
      const doc = res.rows[0];
      if (!doc) throw new NotFoundException("document_not_found");
      const url = await this.storage.presignGet(doc.s3_key);
      return { url };
    });
  }
}
