
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

try:
    conn = psycopg2.connect(user="postgres", password="9ducanh9", host="localhost", port="5432", database="postgres")
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cursor = conn.cursor()
    cursor.execute("CREATE DATABASE bakery")
    print("Database 'bakery' created successfully.")
    cursor.close()
    conn.close()
except psycopg2.errors.DuplicateDatabase:
    print("Database 'bakery' already exists.")
except Exception as e:
    print(f"Error: {e}")
