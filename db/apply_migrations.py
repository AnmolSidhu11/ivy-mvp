"""
Apply Postgres migrations from db/migrations/*.sql in filename order.
Records applied migrations in schema_migrations (created if missing).
"""
import os
import sys
from pathlib import Path

import psycopg

POSTGRES_DSN = os.getenv("POSTGRES_DSN", "postgresql://postgres:postgres@localhost:5432/sanofi")
MIGRATIONS_DIR = Path(__file__).resolve().parent / "migrations"


def ensure_schema_migrations(conn):
    with conn.cursor() as cur:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS schema_migrations (
                migration_name TEXT PRIMARY KEY,
                applied_at TIMESTAMPTZ DEFAULT NOW()
            );
        """)
    conn.commit()


def get_applied(conn):
    with conn.cursor() as cur:
        cur.execute("SELECT migration_name FROM schema_migrations")
        return {row[0] for row in cur.fetchall()}


def apply_migration(conn, name: str, sql: str):
    with conn.cursor() as cur:
        cur.execute(sql)
        cur.execute(
            "INSERT INTO schema_migrations (migration_name) VALUES (%s)",
            (name,),
        )
    conn.commit()


def main():
    if not MIGRATIONS_DIR.is_dir():
        print("Migrations dir not found:", MIGRATIONS_DIR, file=sys.stderr)
        sys.exit(1)

    sql_files = sorted(MIGRATIONS_DIR.glob("*.sql"))
    if not sql_files:
        print("No .sql files in", MIGRATIONS_DIR, file=sys.stderr)
        sys.exit(0)

    try:
        conn = psycopg.connect(POSTGRES_DSN)
    except Exception as e:
        print("Failed to connect:", e, file=sys.stderr)
        sys.exit(1)

    try:
        ensure_schema_migrations(conn)
        applied = get_applied(conn)

        for path in sql_files:
            name = path.name
            if name in applied:
                print("Skip (already applied):", name)
                continue
            sql = path.read_text(encoding="utf-8")
            apply_migration(conn, name, sql)
            print("Applied:", name)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
