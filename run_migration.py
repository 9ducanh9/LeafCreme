#!/usr/bin/env python3
"""Script to run migration for phu_hop_dip column"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.db import engine
from sqlalchemy import text
import json
from datetime import datetime

LOG_PATH = r"c:\Leaf Crème\.cursor\debug.log"

def log_debug(location, message, data, hypothesis_id):
    """Write debug log in NDJSON format"""
    log_entry = {
        "id": f"log_{int(datetime.now().timestamp() * 1000)}",
        "timestamp": int(datetime.now().timestamp() * 1000),
        "location": location,
        "message": message,
        "data": data,
        "sessionId": "debug-session",
        "runId": "run-migration",
        "hypothesisId": hypothesis_id
    }
    try:
        with open(LOG_PATH, "a", encoding="utf-8") as f:
            f.write(json.dumps(log_entry) + "\n")
    except Exception as e:
        print(f"Log write error: {e}")

# #region agent log
log_debug("run_migration.py:start", "Starting migration", {"script": "run_migration.py"}, "A")
# #endregion

try:
    with engine.connect() as conn:
        # Check if column exists first
        # #region agent log
        log_debug("run_migration.py:check_before", "Checking column before migration", {"table": "sanpham", "column": "phu_hop_dip"}, "A")
        # #endregion
        
        check_result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'sanpham' AND column_name = 'phu_hop_dip'
        """))
        
        exists_before = check_result.fetchone() is not None
        
        # #region agent log
        log_debug("run_migration.py:exists_before", "Column exists check", {"exists": exists_before}, "A")
        # #endregion
        
        if exists_before:
            print("✅ Column 'phu_hop_dip' already exists. No migration needed.")
            # #region agent log
            log_debug("run_migration.py:already_exists", "Column already exists", {"status": "skip"}, "A")
            # #endregion
        else:
            print("❌ Column 'phu_hop_dip' does not exist. Running migration...")
            
            # Run migration
            # #region agent log
            log_debug("run_migration.py:before_alter", "About to run ALTER TABLE", {"action": "add_column"}, "A")
            # #endregion
            
            conn.execute(text("""
                ALTER TABLE sanpham 
                ADD COLUMN phu_hop_dip TEXT[] NULL
            """))
            
            # #region agent log
            log_debug("run_migration.py:after_alter", "ALTER TABLE executed", {"status": "success"}, "A")
            # #endregion
            
            conn.commit()
            
            print("✅ Migration executed successfully!")
            
            # Verify
            # #region agent log
            log_debug("run_migration.py:verify", "Verifying column after migration", {"table": "sanpham", "column": "phu_hop_dip"}, "A")
            # #endregion
            
            verify_result = conn.execute(text("""
                SELECT column_name, data_type, is_nullable 
                FROM information_schema.columns 
                WHERE table_name = 'sanpham' AND column_name = 'phu_hop_dip'
            """))
            
            verify_row = verify_result.fetchone()
            
            if verify_row:
                print(f"✅ Verification: Column exists!")
                print(f"   Data type: {verify_row[1]}")
                print(f"   Nullable: {verify_row[2]}")
                # #region agent log
                log_debug("run_migration.py:verify_success", "Column verified", {
                    "exists": True,
                    "data_type": verify_row[1],
                    "nullable": verify_row[2]
                }, "A")
                # #endregion
            else:
                print("❌ Verification failed: Column still does not exist!")
                # #region agent log
                log_debug("run_migration.py:verify_failed", "Verification failed", {"exists": False}, "A")
                # #endregion
                sys.exit(1)
                
except Exception as e:
    print(f"❌ Error: {e}")
    # #region agent log
    log_debug("run_migration.py:error", "Error during migration", {"error": str(e), "error_type": type(e).__name__}, "A")
    # #endregion
    sys.exit(1)



