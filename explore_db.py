import pymongo
from dotenv import load_dotenv
import os

load_dotenv()

# Connect to MongoDB
client = pymongo.MongoClient(os.getenv('DatabaseURL'))

print("=" * 80)
print("EXPLORING MONGODB CLUSTER")
print("=" * 80)

# List all databases
print("\nDatabases in cluster:")
for db_name in client.list_database_names():
    print(f"  - {db_name}")

# Check both MossBot and test databases
for db_name in ['MossBot', 'test']:
    print(f"\n{'=' * 80}")
    print(f"Database: {db_name}")
    print('=' * 80)
    
    db = client[db_name]
    collections = db.list_collection_names()
    
    print(f"\nCollections in {db_name}:")
    for coll_name in collections:
        coll = db[coll_name]
        count = coll.count_documents({})
        print(f"  - {coll_name}: {count} documents")

print("\n" + "=" * 80)
