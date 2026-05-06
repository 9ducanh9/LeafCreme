
import psycopg2
conn = psycopg2.connect(user="postgres", password="9ducanh9", host="localhost", port="5432", database="postgres")
cur = conn.cursor()
cur.execute("SELECT datname FROM pg_database WHERE datistemplate = false;")
for row in cur.fetchall():
    print(row[0])
cur.close()
conn.close()
