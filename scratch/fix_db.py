
import psycopg2
conn = psycopg2.connect(user="postgres", password="9ducanh9", host="localhost", port="5432", database="LeafCreme")
conn.autocommit = True
cur = conn.cursor()
try:
    cur.execute("ALTER TABLE nguoidung ADD COLUMN avatar_url VARCHAR(500);")
    print("Added avatar_url column.")
except Exception as e:
    print(f"Error: {e}")
cur.close()
conn.close()
