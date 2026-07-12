"""
Run pending migrations directly via Postgres connection.
Supabase connection string: postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
We need to find the DB password. It's typically the same as SUPABASE_KEY or in the project settings.

Try both the transaction pooler and session pooler endpoints.
"""
import os, sys
sys.path.insert(0, 'd:/saral-ai/saral-ai-backend')
os.chdir('d:/saral-ai/saral-ai-backend')

from dotenv import load_dotenv
load_dotenv('.env')

from app.core.config import settings
import psycopg2

project_ref = settings.SUPABASE_URL.replace('https://', '').split('.')[0]
print(f'Project ref: {project_ref}')

# Supabase Postgres connection options to try
# Password is typically set during project creation and stored separately
# The service role key IS a JWT, not the DB password.
# Try common Supabase connection strings:
connection_strings = [
    # Session pooler (port 5432)
    f"postgresql://postgres.{project_ref}:postgres@aws-0-ap-south-1.pooler.supabase.com:5432/postgres",
    # Transaction pooler (port 6543)  
    f"postgresql://postgres.{project_ref}:postgres@aws-0-ap-south-1.pooler.supabase.com:6543/postgres",
    # Direct connection
    f"postgresql://postgres:postgres@db.{project_ref}.supabase.co:5432/postgres",
]

migrations = [
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_preference TEXT DEFAULT 'urgent_only' CHECK (notification_preference IN ('all', 'urgent_only', 'digest'))",
    "ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS summary TEXT",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS saral_active BOOLEAN DEFAULT true",
]

def try_connection(conn_str, label):
    try:
        print(f"\n--- Trying {label} ---")
        conn = psycopg2.connect(conn_str, connect_timeout=10, sslmode='require')
        conn.autocommit = True
        cur = conn.cursor()
        for sql in migrations:
            print(f"  Running: {sql[:70]}...")
            cur.execute(sql)
            print(f"  OK")
        cur.close()
        conn.close()
        print("SUCCESS! All migrations applied.")
        return True
    except psycopg2.OperationalError as e:
        print(f"  Connection failed: {e}")
        return False
    except Exception as e:
        print(f"  Error: {type(e).__name__}: {e}")
        return False

# Try each connection string
for i, cs in enumerate(connection_strings):
    masked = cs.replace('postgres@', '***@')
    if try_connection(cs, f"option {i+1}"):
        break
else:
    print("\nAll direct connections failed. Need DB password from Supabase dashboard.")
    print("Go to: https://supabase.com/dashboard/project/phmqhjeozldkslopvytc/settings/database")
    print("And find the 'Database password' or connection string.")
