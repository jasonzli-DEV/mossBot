import pymongo
from datetime import datetime, timedelta
from dotenv import load_dotenv
import os
from zoneinfo import ZoneInfo

load_dotenv()

# Connect to MongoDB
client = pymongo.MongoClient(os.getenv('DatabaseURL'))
db = client['test']
activities = db['useractivities']

print("=" * 80)
print("FIXING WEEKLY AND MONTHLY TIMES")
print("=" * 80)

eastern = ZoneInfo('America/New_York')
now = datetime.now(eastern)

print(f"\nCurrent time (ET): {now}")
print(f"Current day: {now.strftime('%A, %B %d, %Y')}")
print(f"Current week number: {now.isocalendar()[1]}")
print()

# Get all users
users = list(activities.find({}))
print(f"Found {len(users)} users\n")

print("=" * 80)
print("ANALYZING RESET NEEDS")
print("=" * 80)

for user in users:
    username = user.get('username', 'Unknown')
    user_id = user.get('userId')
    
    daily_time = user.get('dailyOnlineTime', 0)
    weekly_time = user.get('weeklyOnlineTime', 0)
    monthly_time = user.get('monthlyOnlineTime', 0)
    
    last_weekly_reset = user.get('lastWeeklyReset')
    last_monthly_reset = user.get('lastMonthlyReset')
    
    if last_weekly_reset:
        last_weekly_reset = last_weekly_reset.replace(tzinfo=ZoneInfo('UTC')).astimezone(eastern)
    if last_monthly_reset:
        last_monthly_reset = last_monthly_reset.replace(tzinfo=ZoneInfo('UTC')).astimezone(eastern)
    
    print(f"\n{username}:")
    print(f"  Weekly: {weekly_time/3600:.2f}h (last reset: {last_weekly_reset})")
    print(f"  Monthly: {monthly_time/3600:.2f}h (last reset: {last_monthly_reset})")
    
    updates = {}
    
    # Check if weekly reset is needed (last reset was in a different week)
    if last_weekly_reset:
        last_week_num = last_weekly_reset.isocalendar()[1]
        current_week_num = now.isocalendar()[1]
        last_year = last_weekly_reset.year
        current_year = now.year
        
        needs_weekly_reset = (current_year > last_year) or (current_week_num != last_week_num)
        
        if needs_weekly_reset:
            # Find the most recent Monday at midnight
            days_since_monday = (now.weekday()) % 7  # Monday = 0
            last_monday = now - timedelta(days=days_since_monday)
            reset_time = last_monday.replace(hour=0, minute=0, second=0, microsecond=0)
            
            updates['weeklyOnlineTime'] = daily_time  # Set to current daily time
            updates['lastWeeklyReset'] = reset_time
            print(f"  ⚠️ NEEDS WEEKLY RESET (last was week {last_week_num}, now week {current_week_num})")
            print(f"     Resetting to {daily_time/3600:.2f}h (current daily time)")
    
    # Check if monthly reset is needed (last reset was in a different month)
    if last_monthly_reset:
        needs_monthly_reset = (now.year > last_monthly_reset.year) or (now.month != last_monthly_reset.month)
        
        if needs_monthly_reset:
            # Find the 1st of current month at midnight
            reset_time = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            
            updates['monthlyOnlineTime'] = max(weekly_time if 'weeklyOnlineTime' not in updates else updates['weeklyOnlineTime'], daily_time)
            updates['lastMonthlyReset'] = reset_time
            print(f"  ⚠️ NEEDS MONTHLY RESET (last was {last_monthly_reset.strftime('%B %Y')}, now {now.strftime('%B %Y')})")
            print(f"     Resetting to {updates['monthlyOnlineTime']/3600:.2f}h (current weekly time)")
    
    if updates:
        activities.update_one({'userId': user_id}, {'$set': updates})
        print(f"  ✅ Updated in database")
    else:
        print(f"  ✅ No reset needed")

print("\n" + "=" * 80)
print("VERIFICATION - NEW STATE")
print("=" * 80)

users = list(activities.find({}))
for user in users:
    username = user.get('username', 'Unknown')
    daily_time = user.get('dailyOnlineTime', 0)
    weekly_time = user.get('weeklyOnlineTime', 0)
    monthly_time = user.get('monthlyOnlineTime', 0)
    
    print(f"\n{username}:")
    print(f"  Daily:   {daily_time/3600:.2f}h ({daily_time/60:.2f}m)")
    print(f"  Weekly:  {weekly_time/3600:.2f}h ({weekly_time/60:.2f}m)")
    print(f"  Monthly: {monthly_time/3600:.2f}h ({monthly_time/60:.2f}m)")
    
    # Verify hierarchy
    if weekly_time < daily_time:
        print(f"  ⚠️ WARNING: Weekly < Daily")
    if monthly_time < weekly_time:
        print(f"  ⚠️ WARNING: Monthly < Weekly")
    if monthly_time < daily_time:
        print(f"  ⚠️ WARNING: Monthly < Daily")

print("\n" + "=" * 80)
print("DONE")
print("=" * 80)
