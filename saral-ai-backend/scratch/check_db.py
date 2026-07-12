import os
import sys
from dotenv import load_dotenv

load_dotenv()
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.supabase_client import get_supabase

def check_users():
    supabase = get_supabase()
    try:
        res = supabase.table("users").select("id, email").execute()
        print("Users in DB:", res.data)
    except Exception as e:
        print("Failed to query users:", e)

if __name__ == "__main__":
    check_users()
