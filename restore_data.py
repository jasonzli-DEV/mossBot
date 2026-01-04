import pymongo
from dotenv import load_dotenv
import os

load_dotenv()

client = pymongo.MongoClient(os.getenv('DatabaseURL'))
db = client['test']
activities = db['useractivities']

# Original values from terminal log (displayed as minutes, raw = minutes * 60)
# Only restoring users that were modified by the broken fix script
original_values = {
    '680223857872994315': {'weekly': 3102500.92 * 60, 'monthly': 3102500.92 * 60},  # sofia4320
    '1253491856839413873': {'weekly': 0, 'monthly': 0},  # ninjaturky
    '1343799919693135975': {'weekly': 26000 * 60, 'monthly': 26000 * 60},  # advik_14270
    '1209880280081633430': {'weekly': 865504.12 * 60, 'monthly': 865504.12 * 60},  # sammyboy90
    '1288337361490411542': {'weekly': 12407344.83 * 60, 'monthly': 12407344.83 * 60},  # Jasonzli
    '1002691838400004227': {'weekly': 2962035.27 * 60, 'monthly': 2962035.27 * 60},  # Steve
    '1283932221920509954': {'weekly': 1468010.25 * 60, 'monthly': 1468010.25 * 60},  # Somi
    '1036132043697950730': {'weekly': 12000 * 60, 'monthly': 12000 * 60},  # Jeff1
    '1076299277321650236': {'weekly': 3717307.35 * 60, 'monthly': 3717307.35 * 60},  # starkwest
    '1449427908215963800': {'weekly': 26589000 * 60, 'monthly': 26589000 * 60},  # Mossy-Internal
}

print("RESTORING ORIGINAL VALUES")
print("=" * 80)

for user_id, values in original_values.items():
    user = activities.find_one({'userId': user_id})
    if user:
        print(f"\nRestoring {user.get('username')}:")
        print(f"  Weekly: {values['weekly']/60:.2f}m ({values['weekly']/3600:.2f}h)")
        print(f"  Monthly: {values['monthly']/60:.2f}m ({values['monthly']/3600:.2f}h)")
        
        activities.update_one(
            {'userId': user_id},
            {'$set': {
                'weeklyOnlineTime': values['weekly'],
                'monthlyOnlineTime': values['monthly']
            }}
        )
        print(f"  ✅ Restored!")

print("\n" + "=" * 80)
print("VERIFICATION")
print("=" * 80)

for user in activities.find({}):
    username = user.get('username')
    weekly = user.get('weeklyOnlineTime', 0)
    monthly = user.get('monthlyOnlineTime', 0)
    print(f"\n{username}:")
    print(f"  Weekly: {weekly/60:.2f}m ({weekly/3600:.2f}h)")
    print(f"  Monthly: {monthly/60:.2f}m ({monthly/3600:.2f}h)")

print("\n✅ DATA RESTORED!")
