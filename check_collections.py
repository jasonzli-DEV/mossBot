import pymongo
from dotenv import load_dotenv
import os

load_dotenv()

# Connect to MongoDB
client = pymongo.MongoClient(os.getenv('DatabaseURL'))
db = client['MossBot']

print("=" * 80)
print("DATABASE COLLECTIONS")
print("=" * 80)

collections = db.list_collection_names()
print(f"\nCollections in MossBot database:")
for coll in collections:
    print(f"  - {coll}")

print("\n" + "=" * 80)
print("CHECKING EACH COLLECTION")
print("=" * 80)

for coll_name in collections:
    coll = db[coll_name]
    count = coll.count_documents({})
    print(f"\n{coll_name}: {count} documents")
    
    if count > 0:
        # Show first document
        sample = coll.find_one()
        print(f"  Sample document fields:")
        for key in sample.keys():
            value = sample[key]
            if isinstance(value, (int, float)):
                print(f"    - {key}: {value}")
            elif isinstance(value, str) and len(value) < 50:
                print(f"    - {key}: {value}")
            else:
                print(f"    - {key}: {type(value).__name__}")

print("\n" + "=" * 80)
