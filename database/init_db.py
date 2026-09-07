from pathlib import Path
import sqlite3


BASE_DIR = Path(__file__).resolve().parent
DB_DIR = BASE_DIR.parent / "data"
DB_PATH = DB_DIR / "app-fit.db"
SCHEMA_PATH = BASE_DIR / "schema.sql"


def column_names(connection: sqlite3.Connection, table_name: str) -> set[str]:
    return {
        row[1]
        for row in connection.execute(f"PRAGMA table_info({table_name})").fetchall()
    }


def add_column_if_missing(
    connection: sqlite3.Connection,
    table_name: str,
    column_name: str,
    statement: str,
) -> None:
    if column_name not in column_names(connection, table_name):
        connection.execute(statement)


def run_migrations(connection: sqlite3.Connection) -> None:
    add_column_if_missing(
        connection,
        "invitations",
        "trainer_id",
        "ALTER TABLE invitations ADD COLUMN trainer_id INTEGER",
    )
    add_column_if_missing(
        connection,
        "invitations",
        "accepted_student_id",
        "ALTER TABLE invitations ADD COLUMN accepted_student_id INTEGER",
    )
    add_column_if_missing(
        connection,
        "invitations",
        "invite_code",
        "ALTER TABLE invitations ADD COLUMN invite_code TEXT",
    )
    add_column_if_missing(
        connection,
        "student_trainers",
        "inactive_reason",
        "ALTER TABLE student_trainers ADD COLUMN inactive_reason TEXT",
    )
    connection.execute(
        "CREATE INDEX IF NOT EXISTS idx_invitations_code ON invitations(invite_code)"
    )
    connection.execute(
        "CREATE INDEX IF NOT EXISTS idx_invitations_trainer ON invitations(trainer_id, status)"
    )


def main() -> None:
    DB_DIR.mkdir(exist_ok=True)

    schema = SCHEMA_PATH.read_text(encoding="utf-8")

    with sqlite3.connect(DB_PATH) as connection:
        connection.execute("PRAGMA foreign_keys = ON;")
        connection.executescript(schema)
        run_migrations(connection)

    print(f"Banco criado/atualizado em: {DB_PATH}")


if __name__ == "__main__":
    main()
