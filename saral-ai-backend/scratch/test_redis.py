"""
Test redis connection to Upstash.
"""
import os
from dotenv import load_dotenv
from redis import from_url

load_dotenv()

redis_url = os.environ.get("REDIS_URL")
print(f"Testing REDIS_URL: {redis_url}")

# Try redis:// first
try:
    print("Trying as is...")
    r = from_url(redis_url)
    r.ping()
    print("Success as is!")
except Exception as e:
    print(f"Failed as is: {e}")

# Try with rediss://
if redis_url.startswith("redis://"):
    rediss_url = redis_url.replace("redis://", "rediss://", 1)
    print(f"Trying with TLS: {rediss_url}")
    try:
        r2 = from_url(rediss_url)
        r2.ping()
        print("Success with TLS!")
    except Exception as e:
        print(f"Failed with TLS: {e}")
