"""One-off migration helper for local SQLite database.

Run this after pulling code that adds new columns.
"""
from sqlalchemy import text, inspect
from database import engine


def add_column_if_missing(table: str, column: str, definition: str):
    inspector = inspect(engine)
    columns = [c["name"] for c in inspector.get_columns(table)]
    if column in columns:
        print(f"✅ Column '{column}' already exists in '{table}'")
        return

    with engine.connect() as conn:
        conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {definition}"))
        conn.commit()
        print(f"✅ Added column '{column}' to '{table}'")


if __name__ == "__main__":
    add_column_if_missing("students", "supervisor_notes", "TEXT")
    print("\nMigration complete.")
