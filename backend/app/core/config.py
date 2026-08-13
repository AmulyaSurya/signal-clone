import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite:///./signal_clone.db"
    jwt_secret: str = "change-this-super-secret-key-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 10080  # 7 days
    mock_otp: str = "123456"
    cors_origins: str = "http://localhost:3000"

    class Config:
        env_file = ".env"

    @property
    def cors_origin_list(self):
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
