const { execSync } = require('child_process');
require('dotenv').config({ path: '.env.local' });

console.log('--- Daily Law Local Scheduler (Dependency-Free) ---');
console.log('Target: http://localhost:3000/api/cron/daily-bill');
console.log('Mode: Running in background loop...');

async function triggerDailyAgent() {
    console.log(`[${new Date().toLocaleString()}] Checking for 12 AM EST update...`);

    // Check if it's currently 12:00 AM EST (approximate check every minute)
    // 12:00 AM EST is 5:00 AM UTC
    const now = new Date();
    if (now.getUTCHours() === 5 && now.getUTCMinutes() === 0) {
        console.log("CRON: It is 12 AM EST. Triggering agent...");
        try {
            const response = await fetch('http://localhost:3000/api/cron/daily-bill', {
                headers: {
                    'Authorization': `Bearer ${process.env.CRON_SECRET}`
                }
            });
            const data = await response.json();
            console.log('Success:', data);
        } catch (error) {
            console.error('Error triggering local agent:', error.message);
        }
    }
}

// Check every minute
setInterval(triggerDailyAgent, 60000);
triggerDailyAgent(); // Run immediately for confirmation
