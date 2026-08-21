import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import helmet from "helmet";
import { createLogger } from "@vertofi/observability";

export interface BootstrapOptions {
  service: string;
  port: number;
  /** Trust proxy headers (behind ALB/gateway). */
  trustProxy?: boolean;
  /**
   * Capture the raw request body as `req.rawBody` (Buffer). Required by services
   * that verify provider webhook HMAC signatures over the exact bytes (e.g.
   * Razorpay) — `JSON.stringify(req.body)` does NOT reproduce the original
   * payload, so signature checks fail without this.
   */
  rawBody?: boolean;
  /**
   * Max request body size (default "15mb"). The Express/Nest default is 100kb,
   * which 413s on base64 image payloads (e.g. the product photo-scan + OCR).
   */
  bodyLimit?: string;
}

/**
 * Common service bootstrap: security headers, strict validation, graceful
 * shutdown, structured startup logging (see docs/15 & docs/16).
 */
export async function bootstrap(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  module: any,
  opts: BootstrapOptions,
): Promise<INestApplication> {
  const log = createLogger(opts.service);
  // Disable the default 100kb body parser and re-register with a generous limit
  // so base64 image uploads (product scan, OCR) don't 413. rawBody capture still
  // works because it's wired through NestFactory's rawBody option.
  const bodyLimit = opts.bodyLimit ?? "15mb";
  const app = await NestFactory.create<NestExpressApplication>(module, {
    bufferLogs: false,
    rawBody: opts.rawBody ?? false,
    bodyParser: false,
  });
  app.useBodyParser("json", { limit: bodyLimit });
  app.useBodyParser("urlencoded", { extended: true, limit: bodyLimit });

  app.use(helmet());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableShutdownHooks();
  if (opts.trustProxy) {
    app.getHttpAdapter().getInstance().set("trust proxy", 1);
  }

  let port = opts.port;
  if (isNaN(port)) {
    const envKey = `${opts.service.toUpperCase().replace(/-/g, "_")}_PORT`;
    const envVal = process.env[envKey];
    if (envVal && envVal.startsWith("tcp://")) {
      const match = envVal.match(/:(\d+)$/);
      if (match) {
        port = Number(match[1]);
      }
    }
  }

  if (isNaN(port) || port <= 0 || port >= 65536) {
    throw new Error(`Invalid port parsed for service ${opts.service}: ${port} (original input: ${opts.port})`);
  }

  await app.listen(port);
  log.info({ port }, `${opts.service} listening`);
  return app;
}
