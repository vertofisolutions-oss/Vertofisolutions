import { Injectable } from "@nestjs/common";
import { Storage } from "@google-cloud/storage";
import { Connector, type ConnectorMeta } from "@vertofi/connectors";

/**
 * Read-only Google Cloud Storage connector for the admin document viewer — no
 * AWS. Auth via Workload Identity (ADC); issues short-lived V4 signed GET URLs
 * so the admin can view any uploaded document without the service proxying bytes.
 */
@Injectable()
export class StorageConnector extends Connector {
  private readonly storage = new Storage();
  readonly bucket: string;

  constructor() {
    super({ id: "storage.gcs", category: "storage", provider: "Google Cloud Storage", environment: process.env.NODE_ENV === "production" ? "production" : "sandbox" } as ConnectorMeta);
    this.bucket = process.env.GCS_BUCKET ?? process.env.S3_BUCKET ?? "vertofi-documents";
  }

  hasCredentials(): boolean {
    return !!(process.env.GCS_BUCKET ?? process.env.S3_BUCKET);
  }

  async presignGet(key: string): Promise<string> {
    this.assertActive();
    const [url] = await this.storage.bucket(this.bucket).file(key).getSignedUrl({ version: "v4", action: "read", expires: Date.now() + 5 * 60 * 1000 });
    return url;
  }
}
