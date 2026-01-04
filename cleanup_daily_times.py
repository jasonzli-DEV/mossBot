import pymongo
from datetime import datetime
from dotenv import load_dotenv
import os
from zoneinfo import ZoneInfo

load_dotenv()

# Connect to MongoDB
client = pymongo.MongoClient(os.getenv('DatabaseURL'))
db = client['test']
activities = db['useractivities']

print("=" * 80)
print("CLEANING UP INFLATED DAILY TIMES")
print("=" * 80)

eastern = ZoneInfo('America/New_York')
now = datetime.now(eastern)

users = list(activities.find({}))

print(f"\nFound {len(users)} users")
print(f"Current time: {now.strftime('%Y-%m-%d %H:%M:%S %Z')}\n")

response = input("This will reset daily times > 24h to 0 and update lastDailyReset. Continue? (yes/no): ").lower()

if response != 'yes':
    print("\nOperation cancelled.")
    exit(0)

print("\nProcessing...\n")

updated_count = 0

for user in users:
    username = user.get('username', 'Unknown')
    user_id = user.get('userId')
    daily = user.get('dailyOnlineTime', 0) / 3600
    
    if daily > 24:
        print(f"  Resetting {username}: {daily:.2f}h -> 0h")
        activities.update_one(
            {'userId': user_id},
            {'$set': {
                'dailyOnlineTime': 0,
                'lastDailyReset': now
            }}
        )
        updated_count += 1

print(f"\n✅ Updated {updated_count} users")

print("\n" + "=" * 80)
print("VERIFICATION")
print("=" * 80)

users = list(activities.find({}))

all_good = True
for user in users:
    username = user.get('username', 'Unknown')
    daily = user.get('dailyOnlineTime', 0) / 3600
    weekly = user.get('weeklyOnlineTime', 0) / 3600
    monthly = user.get('monthlyOnlineTime', 0) / 3600
    
    issues = []
    if daily > 24:
        issues.append(f"Daily > 24h ({daily:.2f}h)")
        all_good = False
    if weekly < daily:
        issues.append("Weekly < Daily")
        all_good = False
    if monthly < weekly:
        issues.append("Monthly < Weekly")
        all_good = False
    
    if issues:
        print(f"\n{username}:")
        print(f"  Daily={daily:.2f}h, Weekly={weekly:.2f}h, Monthly={monthly:.2f}h")
        for issue in issues:
            print(f"  ⚠️ {issue}")

if all_good:
    print("\n✅ All users now have valid time values!")
    print("   - No daily times exceed 24 hours")
    print("   - Weekly >= Daily")
    print("   - Monthly >= Weekly")
else:
    print("\n⚠️ Some issues remain (see above)")

print("\n" + "=" * 80)
print("DONE")
print("=" * 80)
print("\nThe bot's schedulers are now fixed and will maintain proper time tracking.")
print("Make sure the bot runs continuously so the schedulers can execute at midnight.")
