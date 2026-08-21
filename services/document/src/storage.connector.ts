import { Injectable } from "@nestjs/common";
import { Storage } from "@google-cloud/storage";
import { Connector, type ConnectorMeta } from "@vertofi/connectors";

/**
 * Object storage on **Google Cloud Storage (native SDK)** — no AWS.
 *
 * Authenticates via Application Default Credentials (GKE Workload Identity), so
 * there are no static access keys. Issues short-lived V4 signed URLs for direct
 * browser upload/download, so the service never proxies file bytes. Signing with
 * ADC uses the IAM signBlob API, so the runtime service account needs
 * `roles/iam.serviceAccountTokenCreator` on itself (granted in infra).
 * Keys are org-prefixed: <org_id>/<document_id>/v<n>/<filename>.
 */
@Injectable()
export class StorageConnector extends Connector {
  private readonly storage = new Storage();
  readonly bucket: string;

  constructor() {
    const meta: ConnectorMeta = {
      id: "storage.gcs",
      category: "storage",
      provider: "Google Cloud Storage",
      environment: process.env.NODE_ENV === "production" ? "production" : "sandbox",
    };
    super(meta);
    this.bucket = process.env.GCS_BUCKET ?? process.env.S3_BUCKET ?? "vertofi-documents";
  }

  /** Configured when a bucket is set; auth comes from Workload Identity (ADC). */
  hasCredentials(): boolean {
    return !!(process.env.GCS_BUCKET ?? process.env.S3_BUCKET);
  }

  buildKey(orgId: string, documentId: string, version: number, filename: string): string {
    return `${orgId}/${documentId}/v${version}/${filename}`;
  }

  async presignPut(key: string, contentType: string): Promise<string> {
    this.assertActive();
    const [url] = await this.storage.bucket(this.bucket).file(key).getSignedUrl({
      version: "v4",
      action: "write",
      expires: Date.now() + 15 * 60 * 1000,
      contentType,
    });
    return url;
  }

  async presignGet(key: string): Promise<string> {
    this.assertActive();
    const [url] = await this.storage.bucket(this.bucket).file(key).getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + 5 * 60 * 1000,
    });
    return url;
  }
}
