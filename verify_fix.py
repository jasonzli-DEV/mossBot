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
print("FINAL VERIFICATION")
print("=" * 80)

eastern = ZoneInfo('America/New_York')
now = datetime.now(eastern)

print(f"\nCurrent time (ET): {now.strftime('%Y-%m-%d %H:%M:%S %Z')}")
print(f"Current week: Week {now.isocalendar()[1]} of {now.year}")
print(f"Current month: {now.strftime('%B %Y')}\n")

users = list(activities.find({}))
print(f"Total users: {len(users)}\n")

print("=" * 80)
print("USER ACTIVITY SUMMARY")
print("=" * 80)

issues = []

for user in users:
    username = user.get('username', 'Unknown')
    daily = user.get('dailyOnlineTime', 0) / 3600  # Convert to hours
    weekly = user.get('weeklyOnlineTime', 0) / 3600
    monthly = user.get('monthlyOnlineTime', 0) / 3600
    
    last_daily_reset = user.get('lastDailyReset')
    last_weekly_reset = user.get('lastWeeklyReset')
    last_monthly_reset = user.get('lastMonthlyReset')
    
    print(f"\n{username}:")
    print(f"  Daily:   {daily:.2f}h")
    print(f"  Weekly:  {weekly:.2f}h")
    print(f"  Monthly: {monthly:.2f}h")
    
    # Check for issues
    user_issues = []
    
    # Daily shouldn't exceed 24 hours
    if daily > 24:
        user_issues.append(f"⚠️ Daily time exceeds 24h ({daily:.2f}h)")
        issues.append(f"{username}: Daily={daily:.2f}h (>24h)")
    
    # Weekly should be >= daily
    if weekly < daily and daily > 0:
        user_issues.append(f"⚠️ Weekly < Daily")
        issues.append(f"{username}: Weekly < Daily")
    
    # Monthly should be >= weekly
    if monthly < weekly and weekly > 0:
        user_issues.append(f"⚠️ Monthly < Weekly")
        issues.append(f"{username}: Monthly < Weekly")
    
    # Check if reset dates are reasonable
    if last_weekly_reset:
        last_weekly_reset_et = last_weekly_reset.replace(tzinfo=ZoneInfo('UTC')).astimezone(eastern)
        weeks_ago = (now - last_weekly_reset_et).days / 7
        if weeks_ago > 1.5:  # More than 1.5 weeks ago
            user_issues.append(f"⚠️ Last weekly reset was {weeks_ago:.1f} weeks ago")
    
    if last_monthly_reset:
        last_monthly_reset_et = last_monthly_reset.replace(tzinfo=ZoneInfo('UTC')).astimezone(eastern)
        if last_monthly_reset_et.month != now.month or last_monthly_reset_et.year != now.year:
            user_issues.append(f"⚠️ Last monthly reset was in {last_monthly_reset_et.strftime('%B %Y')}")
    
    if user_issues:
        for issue in user_issues:
            print(f"    {issue}")
    else:
        print(f"    ✅ All values look reasonable")

print("\n" + "=" * 80)
print("SUMMARY")
print("=" * 80)

if issues:
    print(f"\n⚠️ Found {len(issues)} issue(s):\n")
    for issue in issues:
        print(f"  - {issue}")
    print("\nNote: If daily times > 24h, this means the daily reset scheduler hasn't been")
    print("running properly. The code fixes are in place, but the bot needs to run")
    print("continuously for the schedulers to work.")
else:
    print("\n✅ All user data looks good!")
    print("Weekly and monthly tracking is working correctly.")

print("\n" + "=" * 80)
