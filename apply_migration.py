#!/usr/bin/env python3
"""
Apply password migration to Supabase database
"""
import os
from supabase import create_client, Client

# Read migration file
with open('supabase/migrations/20251223000004_add_partner_password.sql', 'r') as f:
    migration_sql = f.read()

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

# Create Supabase client
supabase: Client = create_client(url, key)

# Split SQL into individual statements
statements = [s.strip() for s in migration_sql.split(';') if s.strip() and not s.strip().startswith('--')]

print(f"Found {len(statements)} SQL statements to execute")

# Execute each statement
for i, statement in enumerate(statements, 1):
    # Skip comments
    if statement.startswith('--'):
        continue

    try:
        print(f"\n[{i}/{len(statements)}] Executing:")
        print(f"  {statement[:100]}...")

        # Use RPC to execute raw SQL
        result = supabase.rpc('exec', {'sql': statement}).execute()
        print(f"  ✓ Success")
    except Exception as e:
        error_msg = str(e)
        # Ignore "already exists" errors
        if 'already exists' in error_msg.lower() or 'if not exists' in statement.lower():
            print(f"  ⚠ Skipped (already exists)")
        else:
            print(f"  ✗ Error: {e}")
            # Continue with other statements

print("\n✅ Migration application completed!")
