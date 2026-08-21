import { Kafka, type KafkaConfig, type SASLOptions } from "kafkajs";

/**
 * Build a Kafka client for any environment. Auth is fully env-driven so the same
 * code runs against:
 *
 *   • Local Redpanda (plain TCP, no TLS/SASL)            — dev default
 *   • Confluent Cloud   (SASL_SSL + PLAIN api-key)       — GCP production default
 *   • Generic SCRAM     (SASL_SSL + SCRAM-SHA-256/512)   — self-hosted Kafka
 *
 * Detection order:
 *   1. KAFKA_SASL_MECHANISM explicitly set  → use it (recommended for prod).
 *   2. otherwise                             → plain TCP (local dev).
 *
 * Confluent Cloud env (see setup-guide/02-GCP-COMPLETE-SETUP.md):
 *   KAFKA_BROKERS=pkc-xxxxx.asia-south1.gcp.confluent.cloud:9092
 *   KAFKA_SSL=true
 *   KAFKA_SASL_MECHANISM=plain
 *   KAFKA_SASL_USERNAME=<cluster API key>
 *   KAFKA_SASL_PASSWORD=<cluster API secret>
 */
export async function createKafka(
  clientId: string,
  brokers: string[],
): Promise<Kafka> {
  const config: KafkaConfig = {
    clientId,
    brokers,
    retry: { initialRetryTime: 100, retries: 8 },
  };

  const mechanism = (process.env.KAFKA_SASL_MECHANISM ?? "").toLowerCase().trim();

  if (mechanism) {
    // Explicit, provider-agnostic SASL (Confluent Cloud, self-hosted SCRAM, …).
    config.ssl = process.env.KAFKA_SSL !== "false"; // default TLS on when SASL is set
    config.sasl = buildSasl(mechanism);
  }
  // else: plain TCP for local dev (no ssl, no sasl).

  return new Kafka(config);
}

/** Map a SASL mechanism name + env credentials to a kafkajs SASL config. */
function buildSasl(mechanism: string): SASLOptions {
  const username = process.env.KAFKA_SASL_USERNAME ?? "";
  const password = process.env.KAFKA_SASL_PASSWORD ?? "";
  switch (mechanism) {
    case "plain":
      return { mechanism: "plain", username, password };
    case "scram-sha-256":
      return { mechanism: "scram-sha-256", username, password };
    case "scram-sha-512":
      return { mechanism: "scram-sha-512", username, password };
    default:
      throw new Error(
        `Unsupported KAFKA_SASL_MECHANISM "${mechanism}". Use plain | scram-sha-256 | scram-sha-512 (or unset for local dev).`,
      );
  }
}
