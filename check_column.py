#!/usr/bin/env python3
"""Script to check if phu_hop_dip column exists in sanpham table"""
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
        "runId": "check-column",
        "hypothesisId": hypothesis_id
    }
    try:
        with open(LOG_PATH, "a", encoding="utf-8") as f:
            f.write(json.dumps(log_entry) + "\n")
    except Exception as e:
        print(f"Log write error: {e}")

# #region agent log
log_debug("check_column.py:start", "Starting column check", {"script": "check_column.py"}, "A")
# #endregion

try:
    # #region agent log
    log_debug("check_column.py:connect", "Connecting to database", {"database_url": engine.url.database if hasattr(engine.url, 'database') else 'unknown'}, "A")
    # #endregion
    
    with engine.connect() as conn:
        # Check if column exists
        # #region agent log
        log_debug("check_column.py:check", "Checking column existence", {"table": "sanpham", "column": "phu_hop_dip"}, "A")
        # #endregion
        
        result = conn.execute(text("""
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'sanpham' AND column_name = 'phu_hop_dip'
        """))
        
        row = result.fetchone()
        
        # #region agent log
        log_debug("check_column.py:result", "Column check result", {
            "exists": row is not None,
            "column_info": dict(row._mapping) if row else None
        }, "A")
        # #endregion
        
        if row:
            print("✅ Column 'phu_hop_dip' EXISTS in table 'sanpham'")
            print(f"   Data type: {row[1]}")
            print(f"   Nullable: {row[2]}")
            # #region agent log
            log_debug("check_column.py:success", "Column exists", {"status": "found"}, "A")
            # #endregion
        else:
            print("❌ Column 'phu_hop_dip' DOES NOT EXIST in table 'sanpham'")
            print("   Migration needs to be run!")
            # #region agent log
            log_debug("check_column.py:missing", "Column missing", {"status": "not_found", "action": "run_migration"}, "A")
            # #endregion
            
            # Check if table exists
            table_check = conn.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_name = 'sanpham'
            """))
            table_exists = table_check.fetchone() is not None
            
            # #region agent log
            log_debug("check_column.py:table_check", "Table existence check", {"table_exists": table_exists}, "A")
            # #endregion
            
            if not table_exists:
                print("❌ Table 'sanpham' does not exist!")
            else:
                print("✅ Table 'sanpham' exists, but column is missing")
                
except Exception as e:
    print(f"❌ Error: {e}")
    # #region agent log
    log_debug("check_column.py:error", "Error during check", {"error": str(e), "error_type": type(e).__name__}, "A")
    # #endregion
    sys.exit(1)



