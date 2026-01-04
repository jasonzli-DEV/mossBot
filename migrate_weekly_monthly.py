import pymongo
from datetime import datetime, timedelta
from dotenv import load_dotenv
import os
from zoneinfo import ZoneInfo

load_dotenv()

# Connect to MongoDB
client = pymongo.MongoClient(os.getenv('DatabaseURL'))
db = client['test']  # Data is in 'test' database

# Find the correct collection
collections = db.list_collection_names()
print(f"Using database: test")
print(f"Available collections: {collections}\n")

activities = db['useractivities']
print(f"✅ Using collection: useractivities\n")

# Check current data
count = activities.count_documents({})
print(f"Current documents in collection: {count}\n")

if count > 0:
    print("=" * 80)
    print("CURRENT DATABASE STATE")
    print("=" * 80)
    
    users = list(activities.find({}))
    eastern = ZoneInfo('America/New_York')
    now = datetime.now(eastern)
    
    for user in users:
        username = user.get('username', 'Unknown')
        user_id = user.get('userId', 'Unknown')
        
        daily_time = user.get('dailyOnlineTime', 0)
        weekly_time = user.get('weeklyOnlineTime', 0)
        monthly_time = user.get('monthlyOnlineTime', 0)
        
        last_daily_reset = user.get('lastDailyReset')
        last_weekly_reset = user.get('lastWeeklyReset')
        last_monthly_reset = user.get('lastMonthlyReset')
        
        print(f"\nUser: {username} (ID: {user_id})")
        print(f"  Daily: {daily_time/60:.2f}m ({daily_time/3600:.2f}h)")
        print(f"  Weekly: {weekly_time/60:.2f}m ({weekly_time/3600:.2f}h)")
        print(f"  Monthly: {monthly_time/60:.2f}m ({monthly_time/3600:.2f}h)")
        print(f"  Last Daily Reset: {last_daily_reset}")
        print(f"  Last Weekly Reset: {last_weekly_reset}")
        print(f"  Last Monthly Reset: {last_monthly_reset}")
        
        # Check for issues
        issues = []
        
        if weekly_time == 0 and daily_time > 0:
            issues.append("⚠️ Weekly time is 0 but daily time has data")
        
        if monthly_time == 0 and daily_time > 0:
            issues.append("⚠️ Monthly time is 0 but daily time has data")
        
        if not last_weekly_reset:
            issues.append("⚠️ Missing lastWeeklyReset field")
        
        if not last_monthly_reset:
            issues.append("⚠️ Missing lastMonthlyReset field")
        
        if weekly_time > 0 and daily_time > 0 and weekly_time < daily_time:
            issues.append(f"⚠️ Weekly time < Daily time")
        
        if monthly_time > 0 and weekly_time > 0 and monthly_time < weekly_time:
            issues.append(f"⚠️ Monthly time < Weekly time")
        
        if issues:
            print("  ISSUES FOUND:")
            for issue in issues:
                print(f"    {issue}")
    
    print("\n" + "=" * 80)
    
    # Ask if user wants to migrate
    response = input("\nDo you want to migrate/fix the data? (yes/no): ").lower()
    
    if response == 'yes':
        print("\nMigrating data...")
        
        for user in users:
            user_id = user.get('userId')
            daily_time = user.get('dailyOnlineTime', 0)
            weekly_time = user.get('weeklyOnlineTime', 0)
            monthly_time = user.get('monthlyOnlineTime', 0)
            
            updates = {}
            
            # If weekly time is 0 but daily has data, set weekly = daily
            if weekly_time == 0 and daily_time > 0:
                updates['weeklyOnlineTime'] = daily_time
                print(f"  Migrating weekly time for {user.get('username')}: 0 -> {daily_time/60:.2f}m")
            
            # If monthly time is 0 but weekly has data, set monthly = weekly (or daily if weekly is 0)
            if monthly_time == 0 and (weekly_time > 0 or daily_time > 0):
                updates['monthlyOnlineTime'] = max(weekly_time, daily_time)
                print(f"  Migrating monthly time for {user.get('username')}: 0 -> {max(weekly_time, daily_time)/60:.2f}m")
            
            # If weekly < daily, set weekly = daily
            if weekly_time > 0 and daily_time > 0 and weekly_time < daily_time:
                updates['weeklyOnlineTime'] = daily_time
                print(f"  Fixing weekly time for {user.get('username')}: {weekly_time/60:.2f}m -> {daily_time/60:.2f}m")
            
            # If monthly < weekly, set monthly = weekly
            if monthly_time > 0 and weekly_time > 0 and monthly_time < weekly_time:
                updates['monthlyOnlineTime'] = weekly_time
                print(f"  Fixing monthly time for {user.get('username')}: {monthly_time/60:.2f}m -> {weekly_time/60:.2f}m")
            
            # Ensure reset dates exist
            if not user.get('lastWeeklyReset'):
                updates['lastWeeklyReset'] = user.get('lastDailyReset', datetime.now(eastern))
                print(f"  Adding lastWeeklyReset for {user.get('username')}")
            
            if not user.get('lastMonthlyReset'):
                updates['lastMonthlyReset'] = user.get('lastDailyReset', datetime.now(eastern))
                print(f"  Adding lastMonthlyReset for {user.get('username')}")
            
            # Apply updates
            if updates:
                activities.update_one(
                    {'userId': user_id},
                    {'$set': updates}
                )
        
        print("\n✅ Migration completed!")
        
        # Show updated state
        print("\n" + "=" * 80)
        print("UPDATED DATABASE STATE")
        print("=" * 80)
        
        users = list(activities.find({}))
        for user in users:
            username = user.get('username', 'Unknown')
            daily_time = user.get('dailyOnlineTime', 0)
            weekly_time = user.get('weeklyOnlineTime', 0)
            monthly_time = user.get('monthlyOnlineTime', 0)
            
            print(f"\nUser: {username}")
            print(f"  Daily: {daily_time/60:.2f}m ({daily_time/3600:.2f}h)")
            print(f"  Weekly: {weekly_time/60:.2f}m ({weekly_time/3600:.2f}h)")
            print(f"  Monthly: {monthly_time/60:.2f}m ({monthly_time/3600:.2f}h)")
            print(f"  ✅ All times properly set")
    else:
        print("\nMigration cancelled.")
else:
    print("⚠️ No data in database. The bot needs to run and track activity first.")
    print("Once the bot creates user activity data, run this script again to check/fix it.")

print("\n" + "=" * 80)
print("DONE")
print("=" * 80)
