"""ai-gateway configuration (docs/services/ai-gateway-service.md)."""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    ai_gateway_port: int = 4010
    redis_url: str = "redis://localhost:6379"
    node_env: str = "development"

    # OpenAI — blank => NEEDS_CREDENTIALS (callers fall back to rules; never fake).
    openai_api_key: str = ""

    # Model tiering (docs/09): cheap model for high-volume, capable for premium.
    model_mini: str = "gpt-4o-mini"
    model_pro: str = "gpt-4o"
    model_embed: str = "text-embedding-3-small"

    # Resilience
    max_retries: int = 4
    circuit_threshold: int = 5
    circuit_cooldown_s: int = 30
    cache_ttl_s: int = 86400  # exact-prompt cache

    @property
    def is_prod(self) -> bool:
        return self.node_env == "production"


settings = Settings()
