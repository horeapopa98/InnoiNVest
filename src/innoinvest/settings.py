from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://innoinvest:innoinvest@localhost:5434/innoinvest"
    ins_tempo_base_url: str = "http://statistici.insse.ro:8077/tempo-ins"
    eurostat_base_url: str = "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data"


settings = Settings()
