
import psycopg2
conn = psycopg2.connect(user="postgres", password="9ducanh9", host="localhost", port="5432", database="LeafCreme")
cur = conn.cursor()
cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")
tables = cur.fetchall()
if not tables:
    print("LeafCreme database has no tables!")
else:
    for row in tables:
        print(row[0])
cur.close()
conn.close()
