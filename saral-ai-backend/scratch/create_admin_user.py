import os
import sys
import argparse
from dotenv import load_dotenv

# Add app directory to Python path so we can import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load dotenv BEFORE importing app modules so settings initializes correctly
dotenv_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
load_dotenv(dotenv_path)

from app.db.supabase_client import get_supabase

def create_admin_user(email, password):
    supabase = get_supabase()
    
    print(f"Attempting to create user with email: {email}")
    try:
        # Create user via Supabase Auth Admin API (automatically confirmed)
        auth_response = supabase.auth.admin.create_user(
            attributes={
                "email": email,
                "password": password,
                "email_confirm": True
            }
        )
        user_id = auth_response.user.id
        print(f"Supabase Auth user created successfully. ID: {user_id}")
        
        # Insert/Update record in public.users table and mark active
        try:
            existing = supabase.table("users").select("*").eq("id", user_id).execute()
            if not existing.data:
                user_data = {
                    "id": user_id,
                    "email": email,
                    "password_hash": "supabase_auth",
                    "business_name": "Saral AI Admin",
                    "whatsapp_number": "",
                    "saral_active": True
                }
                supabase.table("users").insert(user_data).execute()
                print("Profile inserted in public.users table and marked as active.")
            else:
                supabase.table("users").update({"saral_active": True, "business_name": "Saral AI Admin"}).eq("id", user_id).execute()
                print("Profile updated in public.users table and marked as active.")
        except Exception as db_err:
            print(f"Note: Error inserting profile in public.users: {db_err}")
            
    except Exception as e:
        print(f"Error creating auth user: {e}")
        # Try fallback: Check if user exists in public.users, mark them as active if they do
        try:
            print("Checking if user already exists in public.users...")
            existing_user = supabase.table("users").select("*").eq("email", email).execute()
            if existing_user.data:
                uid = existing_user.data[0]["id"]
                supabase.table("users").update({"saral_active": True}).eq("id", uid).execute()
                print(f"Updated existing user {email} in public.users to saral_active=True.")
            else:
                print("User does not exist in public.users.")
        except Exception as check_err:
            print(f"Failed to update existing user: {check_err}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Create a user in Supabase Auth and public.users")
    parser.add_argument("--email", required=True, help="Email address")
    parser.add_argument("--password", required=True, help="Password")
    args = parser.parse_args()
    
    create_admin_user(args.email, args.password)
