"""Wipe all existing datasets, versions, plans, jobs, passports, and storage files.
Preserves user accounts, workspaces, and memberships so sessions remain valid.
"""
import os
import shutil
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = ROOT / "data" / "datacrew.db"
STORAGE_DIR = ROOT / "data" / "storage"

def wipe_all():
    print(f"Connecting to {DB_PATH}...")
    con = sqlite3.connect(DB_PATH)
    cur = con.cursor()

    tables_to_clear = [
        "datasets",
        "dataset_versions",
        "plans",
        "jobs",
        "passports",
        "forecasts",
        "crew_runs",
        "audit_log",
        "privacy_ledger",
    ]

    for table in tables_to_clear:
        try:
            count = cur.execute(f"SELECT count(*) FROM {table}").fetchone()[0]
            cur.execute(f"DELETE FROM {table}")
            print(f"Cleared table '{table}': removed {count} rows")
        except sqlite3.OperationalError as e:
            print(f"Skipping '{table}': {e}")

    con.commit()
    con.close()
    print("Database cleared of all dataset records.")

    # Clear storage directory contents while keeping the folder intact
    if STORAGE_DIR.exists():
        for item in STORAGE_DIR.iterdir():
            if item.name == "notifications.log":
                continue
            if item.is_dir():
                shutil.rmtree(item)
                print(f"Removed storage directory: {item.name}")
            else:
                item.unlink()
                print(f"Removed storage file: {item.name}")
    else:
        STORAGE_DIR.mkdir(parents=True, exist_ok=True)

    print("Storage directory cleared.")
    print("Application is now completely fresh and ready for new dataset uploads!")

if __name__ == "__main__":
    wipe_all()
