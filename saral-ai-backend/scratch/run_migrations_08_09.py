import os
import sys
import requests
import re
from pathlib import Path
from dotenv import load_dotenv

# Add app directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load dotenv
dotenv_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
load_dotenv(dotenv_path)

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_KEY"]

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
}

def run_sql(sql_stmt):
    # Try the raw Postgres query endpoint exposed via Supabase management proxy
    resp = requests.post(
        f"{SUPABASE_URL}/pg/query",
        headers=headers,
        json={"query": sql_stmt},
        timeout=30
    )
    if resp.status_code >= 300:
        raise Exception(f"HTTP {resp.status_code}: {resp.text}")
    return resp.json()

def apply_migration(file_path):
    print(f"\n========================================\nApplying migration: {file_path.name}\n========================================")
    sql_content = file_path.read_text(encoding="utf-8")
    
    # Split on semicolons that end a line
    statements = re.split(r';\s*\n', sql_content)
    
    for stmt in statements:
        stmt = stmt.strip()
        if not stmt:
            continue
        # Remove comments for clean logging
        stmt_clean = re.sub(r'--[^\n]*', '', stmt).strip()
        if not stmt_clean:
            continue
            
        print(f"Running statement: {stmt_clean[:100]}...")
        try:
            run_sql(stmt)
            print("  SUCCESS")
        except Exception as e:
            print(f"  FAILED: {e}")
            # Try running the block as-is
            try:
                run_sql(stmt + ";")
                print("  SUCCESS (with appended semicolon)")
            except Exception as e2:
                print(f"  RETRY FAILED: {e2}")
                raise e2

if __name__ == "__main__":
    migrations_dir = Path(__file__).parent.parent / "app" / "db" / "migrations"
    
    # Migration 08
    m08 = migrations_dir / "08_add_system_prompt_and_voice_id.sql"
    if m08.exists():
        try:
            apply_migration(m08)
        except Exception as e:
            print(f"Could not apply migration 08: {e}")
            sys.exit(1)
    else:
        print("Migration 08 not found!")
        
    # Migration 09
    m09 = migrations_dir / "09_create_agents_table.sql"
    if m09.exists():
        try:
            apply_migration(m09)
        except Exception as e:
            print(f"Could not apply migration 09: {e}")
            sys.exit(1)
    else:
        print("Migration 09 not found!")
        
    print("\nAll migrations completed successfully!")
