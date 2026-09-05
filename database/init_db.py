from pathlib import Path
import sqlite3


BASE_DIR = Path(__file__).resolve().parent
DB_DIR = BASE_DIR.parent / "data"
DB_PATH = DB_DIR / "app-fit.db"
SCHEMA_PATH = BASE_DIR / "schema.sql"


def main() -> None:
    DB_DIR.mkdir(exist_ok=True)

    schema = SCHEMA_PATH.read_text(encoding="utf-8")

    with sqlite3.connect(DB_PATH) as connection:
      connection.execute("PRAGMA foreign_keys = ON;")
      connection.executescript(schema)

    print(f"Banco criado/atualizado em: {DB_PATH}")


if __name__ == "__main__":
    main()
