import ssl

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql://vertofi:vertofi@localhost:5432/vertofi"
    kafka_brokers: str = "localhost:19092"
    ai_gateway_url: str = "http://localhost:4010"
    categorization_port: int = 4012
    # Confidence below which we DON'T auto-categorize — route to human review.
    review_threshold: float = 0.7

    # Kafka auth — env-driven, matches @vertofi/events. Confluent Cloud uses
    # KAFKA_SASL_MECHANISM=plain + KAFKA_SSL=true + API key/secret.
    kafka_sasl_mechanism: str = ""  # plain | scram-sha-256 | scram-sha-512
    kafka_sasl_username: str = ""
    kafka_sasl_password: str = ""
    kafka_ssl: str = ""  # "false" to disable TLS even when SASL is set

    @property
    def brokers(self) -> list[str]:
        return self.kafka_brokers.split(",")

    def kafka_kwargs(self) -> dict:
        """Extra aiokafka kwargs for SASL_SSL (Confluent) vs plain local dev."""
        if not self.kafka_sasl_mechanism:
            return {}
        use_ssl = self.kafka_ssl != "false"
        kwargs: dict = {
            "security_protocol": "SASL_SSL" if use_ssl else "SASL_PLAINTEXT",
            "sasl_mechanism": self.kafka_sasl_mechanism.upper(),
            "sasl_plain_username": self.kafka_sasl_username,
            "sasl_plain_password": self.kafka_sasl_password,
        }
        if use_ssl:
            kwargs["ssl_context"] = ssl.create_default_context()
        return kwargs


settings = Settings()
