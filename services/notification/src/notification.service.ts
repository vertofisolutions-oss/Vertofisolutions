import { Injectable } from "@nestjs/common";
import { PgService } from "@vertofi/nest-common";

export interface NotificationRow {
  id: string;
  org_id: string | null;
  user_id: string;
  channel: string;
  template: string;
  title: string;
  body: string;
  severity: string;
  status: string;
  read_at: string | null;
  created_at: string;
}

@Injectable()
export class NotificationService {
  constructor(private readonly pg: PgService) {}

  async create(input: {
    userId: string;
    orgId?: string;
    template: string;
    title: string;
    body: string;
    severity?: "INFO" | "WARNING" | "CRITICAL";
    channel?: string;
    payload?: Record<string, unknown>;
  }): Promise<NotificationRow> {
    const rows = await this.pg.query<NotificationRow>(
      `INSERT INTO notification.notifications (org_id, user_id, channel, template, title, body, severity, payload, status, sent_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'SENT', now()) RETURNING *`,
      [
        input.orgId ?? null,
        input.userId,
        input.channel ?? "IN_APP",
        input.template,
        input.title,
        input.body,
        input.severity ?? "INFO",
        JSON.stringify(input.payload ?? {}),
      ],
    );
    return rows[0]!;
  }

  async list(userId: string, unreadOnly: boolean): Promise<NotificationRow[]> {
    const where = unreadOnly ? "AND read_at IS NULL" : "";
    return this.pg.query<NotificationRow>(
      `SELECT * FROM notification.notifications WHERE user_id = $1 ${where} ORDER BY created_at DESC LIMIT 100`,
      [userId],
    );
  }

  async markRead(userId: string, id: string): Promise<void> {
    await this.pg.query(
      "UPDATE notification.notifications SET read_at = now(), status='READ' WHERE id = $1 AND user_id = $2",
      [id, userId],
    );
  }

  async markAllRead(userId: string): Promise<void> {
    await this.pg.query(
      "UPDATE notification.notifications SET read_at = now(), status='READ' WHERE user_id = $1 AND read_at IS NULL",
      [userId],
    );
  }
}
