from pathlib import Path
import sqlite3


DB_PATH = Path(__file__).resolve().parent.parent / "data" / "app-fit.db"


def main() -> None:
    with sqlite3.connect(DB_PATH) as connection:
        tables = connection.execute(
            """
            SELECT name
            FROM sqlite_master
            WHERE type = 'table'
              AND name NOT LIKE 'sqlite_%'
            ORDER BY name
            """
        ).fetchall()

        roles = connection.execute(
            "SELECT id, name FROM user_roles ORDER BY id"
        ).fetchall()

    print("Tabelas:")
    for (table_name,) in tables:
        print(f"- {table_name}")

    print("\nPerfis:")
    for role_id, role_name in roles:
        print(f"- {role_id}: {role_name}")


if __name__ == "__main__":
    main()
