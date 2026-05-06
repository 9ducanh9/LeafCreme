
import psycopg2
conn = psycopg2.connect(user="postgres", password="9ducanh9", host="localhost", port="5432", database="LeafCreme")
cur = conn.cursor()
cur.execute("SELECT ten_dang_nhap FROM nguoidung LIMIT 5")
users = cur.fetchall()
if not users:
    print("No users found.")
else:
    for row in users:
        print(row[0])
cur.close()
conn.close()
