import pymongo
from datetime import datetime, timedelta
from dotenv import load_dotenv
import os
from zoneinfo import ZoneInfo

load_dotenv()

# Connect to MongoDB
client = pymongo.MongoClient(os.getenv('DatabaseURL'))
db = client['MossBot']

# Try different collection names
possible_names = ['useractivities', 'UserActivities', 'useractivity', 'UserActivity']

print("=" * 80)
print("FINDING COLLECTION")
print("=" * 80)

collections = db.list_collection_names()
print(f"Available collections: {collections}")

activities = None
for name in possible_names:
    if name in collections:
        activities = db[name]
        print(f"\n✅ Found collection: {name}")
        break

if not activities:
    print("\n❌ Could not find activity collection. Using 'useractivities'")
    activities = db['useractivities']

count = activities.count_documents({})
print(f"Documents in collection: {count}\n")

if count == 0:
    print("⚠️ No data in database yet. The bot may need to run first to create data.")
    exit(0)

print("=" * 80)
print("INSPECTING WEEKLY AND MONTHLY ACTIVITY DATA")
print("=" * 80)

# Get all users with activity data
users = list(activities.find({}))
print(f"\nFound {len(users)} users in database\n")

# Define Eastern Time
eastern = ZoneInfo('America/New_York')
now = datetime.now(eastern)

print(f"Current time (ET): {now}")
print(f"Current day of week: {now.strftime('%A')}")
print()

# Check each user
for user in users:
    username = user.get('username', 'Unknown')
    user_id = user.get('userId', 'Unknown')
    minecraft_username = user.get('minecraftUsername', 'Unknown')
    
    daily_time = user.get('dailyOnlineTime', 0)
    weekly_time = user.get('weeklyOnlineTime', 0)
    monthly_time = user.get('monthlyOnlineTime', 0)
    
    last_daily_reset = user.get('lastDailyReset')
    last_weekly_reset = user.get('lastWeeklyReset')
    last_monthly_reset = user.get('lastMonthlyReset')
    
    print(f"User: {username} (MC: {minecraft_username})")
    print(f"  User ID: {user_id}")
    print(f"  Daily Time: {daily_time/60:.2f} minutes ({daily_time/3600:.2f} hours)")
    print(f"  Weekly Time: {weekly_time/60:.2f} minutes ({weekly_time/3600:.2f} hours)")
    print(f"  Monthly Time: {monthly_time/60:.2f} minutes ({monthly_time/3600:.2f} hours)")
    print(f"  Last Daily Reset: {last_daily_reset}")
    print(f"  Last Weekly Reset: {last_weekly_reset}")
    print(f"  Last Monthly Reset: {last_monthly_reset}")
    
    # Check for issues
    issues = []
    
    # Check if weekly time exists but is 0
    if weekly_time == 0 and daily_time > 0:
        issues.append("⚠️ Weekly time is 0 but daily time has data")
    
    # Check if monthly time exists but is 0
    if monthly_time == 0 and daily_time > 0:
        issues.append("⚠️ Monthly time is 0 but daily time has data")
    
    # Check if lastWeeklyReset exists
    if not last_weekly_reset:
        issues.append("⚠️ Missing lastWeeklyReset field")
    
    # Check if lastMonthlyReset exists
    if not last_monthly_reset:
        issues.append("⚠️ Missing lastMonthlyReset field")
    
    # Check if weekly time is less than daily time (should be >= daily)
    if weekly_time > 0 and daily_time > 0 and weekly_time < daily_time:
        issues.append(f"⚠️ Weekly time ({weekly_time/60:.2f}m) < Daily time ({daily_time/60:.2f}m)")
    
    # Check if monthly time is less than weekly time (should be >= weekly)
    if monthly_time > 0 and weekly_time > 0 and monthly_time < weekly_time:
        issues.append(f"⚠️ Monthly time ({monthly_time/60:.2f}m) < Weekly time ({weekly_time/60:.2f}m)")
    
    if issues:
        print("  ISSUES:")
        for issue in issues:
            print(f"    {issue}")
    else:
        print("  ✅ No issues detected")
    
    print()

print("=" * 80)
print("CHECKING DATABASE SCHEMA")
print("=" * 80)

# Check if all users have the required fields
sample_user = users[0] if users else None
if sample_user:
    print("\nFields in database:")
    for key in sample_user.keys():
        print(f"  - {key}")
    
    print("\nRequired fields check:")
    required = ['dailyOnlineTime', 'weeklyOnlineTime', 'monthlyOnlineTime', 'lastDailyReset', 'lastWeeklyReset', 'lastMonthlyReset']
    for field in required:
        if field in sample_user:
            print(f"  ✅ {field}")
        else:
            print(f"  ❌ {field} - MISSING!")

print("\n" + "=" * 80)
