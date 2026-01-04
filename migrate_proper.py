import pymongo
from datetime import datetime
from dotenv import load_dotenv
import os
from zoneinfo import ZoneInfo

load_dotenv()

client = pymongo.MongoClient(os.getenv('DatabaseURL'))
db = client['test']
activities = db['useractivities']

print("=" * 80)
print("MIGRATING WEEKLY/MONTHLY DATA TO REALISTIC VALUES")
print("=" * 80)

eastern = ZoneInfo('America/New_York')
now = datetime.now(eastern)

# Maximum possible times
MAX_WEEKLY_MS = 7 * 24 * 60 * 60 * 1000  # 168 hours in ms
MAX_MONTHLY_MS = 31 * 24 * 60 * 60 * 1000  # 744 hours in ms (31 days)

print(f"\nMax weekly: {MAX_WEEKLY_MS / 3600000:.0f} hours")
print(f"Max monthly: {MAX_MONTHLY_MS / 3600000:.0f} hours")
print()

users = list(activities.find({}))

for user in users:
    username = user.get('username', 'Unknown')
    user_id = user.get('userId')
    
    daily = user.get('dailyOnlineTime', 0)
    weekly = user.get('weeklyOnlineTime', 0)
    monthly = user.get('monthlyOnlineTime', 0)
    
    updates = {}
    
    print(f"\n{username}:")
    print(f"  Current - Daily: {daily/3600000:.2f}h, Weekly: {weekly/3600000:.2f}h, Monthly: {monthly/3600000:.2f}h")
    
    # Cap weekly at 168 hours (but at least daily time)
    if weekly > MAX_WEEKLY_MS:
        new_weekly = min(MAX_WEEKLY_MS, max(daily, MAX_WEEKLY_MS))
        updates['weeklyOnlineTime'] = new_weekly
        print(f"  -> Capping weekly: {weekly/3600000:.2f}h -> {new_weekly/3600000:.2f}h")
    
    # Cap monthly at 744 hours (but at least weekly time)
    new_weekly_val = updates.get('weeklyOnlineTime', weekly)
    if monthly > MAX_MONTHLY_MS:
        new_monthly = min(MAX_MONTHLY_MS, max(new_weekly_val, MAX_MONTHLY_MS))
        updates['monthlyOnlineTime'] = new_monthly
        print(f"  -> Capping monthly: {monthly/3600000:.2f}h -> {new_monthly/3600000:.2f}h")
    
    # Ensure weekly >= daily
    new_weekly_val = updates.get('weeklyOnlineTime', weekly)
    if new_weekly_val < daily:
        updates['weeklyOnlineTime'] = daily
        print(f"  -> Setting weekly = daily: {daily/3600000:.2f}h")
    
    # Ensure monthly >= weekly
    new_weekly_val = updates.get('weeklyOnlineTime', weekly)
    new_monthly_val = updates.get('monthlyOnlineTime', monthly)
    if new_monthly_val < new_weekly_val:
        updates['monthlyOnlineTime'] = new_weekly_val
        print(f"  -> Setting monthly = weekly: {new_weekly_val/3600000:.2f}h")
    
    # Update reset dates to now (since we're migrating)
    updates['lastWeeklyReset'] = now
    updates['lastMonthlyReset'] = now
    
    if updates:
        activities.update_one({'userId': user_id}, {'$set': updates})
        print(f"  ✅ Updated")
    else:
        print(f"  ✅ No changes needed")

print("\n" + "=" * 80)
print("VERIFICATION")
print("=" * 80)

users = list(activities.find({}))
for user in users:
    username = user.get('username')
    daily = user.get('dailyOnlineTime', 0) / 3600000
    weekly = user.get('weeklyOnlineTime', 0) / 3600000
    monthly = user.get('monthlyOnlineTime', 0) / 3600000
    
    status = "✅"
    if weekly > 168:
        status = "⚠️ Weekly > 168h"
    elif monthly > 744:
        status = "⚠️ Monthly > 744h"
    elif weekly < daily:
        status = "⚠️ Weekly < Daily"
    elif monthly < weekly:
        status = "⚠️ Monthly < Weekly"
    
    print(f"{username}: D={daily:.1f}h W={weekly:.1f}h M={monthly:.1f}h {status}")

print("\n✅ Migration complete!")
