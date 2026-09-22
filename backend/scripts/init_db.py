import sys
import re
from urllib.parse import urlparse
import psycopg
from app.core.config import settings

def init_database():
    raw_url = settings.DATABASE_URL
    print("[*] Verifying PostgreSQL connection from settings...")

    # Pattern: scheme://user:pass@host:port/dbname
    match = re.match(r"^([^:]+)://([^:]+):(.*)@([^@/:]+)(?::(\d+))?/(.+)$", raw_url)
    if not match:
        print("[-] DATABASE_URL format unrecognized.", file=sys.stderr)
        return False

    scheme, user, password, host, port, dbname = match.groups()
    port = int(port) if port else 5432

    try:
        # Connect to maintenance database 'postgres' with autocommit=True
        print(f"[*] Connecting to maintenance database 'postgres' at {host}:{port}...")
        with psycopg.connect(
            host=host,
            port=port,
            user=user,
            password=password,
            dbname="postgres",
            autocommit=True
        ) as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", (dbname,))
                exists = cur.fetchone()
                if not exists:
                    print(f"[*] Database '{dbname}' does not exist. Creating...")
                    cur.execute(f'CREATE DATABASE "{dbname}"')
                    print(f"[+] Database '{dbname}' created successfully.")
                else:
                    print(f"[+] Database '{dbname}' already exists.")

        # Now verify direct connection to target database
        print(f"[*] Verifying direct connection to '{dbname}'...")
        with psycopg.connect(
            host=host,
            port=port,
            user=user,
            password=password,
            dbname=dbname
        ) as target_conn:
            with target_conn.cursor() as cur:
                cur.execute("SELECT 1;")
                res = cur.fetchone()
                if res and res[0] == 1:
                    print(f"[+] Verified connection to database '{dbname}' successfully!")
                    return True

        return False

    except Exception as e:
        err_msg = str(e)
        sanitized_err = re.sub(r':[^:@/]+@', ':****@', err_msg)
        print(f"[-] Database initialization failed: {sanitized_err}", file=sys.stderr)
        return False

if __name__ == "__main__":
    success = init_database()
    sys.exit(0 if success else 1)
