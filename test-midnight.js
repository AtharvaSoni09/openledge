require('dotenv').config({ path: '.env.local' });

async function verifyMidnightTrigger() {
    console.log("--- Local Midnight Trigger Simulation ---");
    console.log("Target: http://localhost:3000/api/cron/daily-bill");

    if (!process.env.CRON_SECRET) {
        console.error("ERROR: CRON_SECRET not found in .env.local");
        return;
    }

    try {
        const response = await fetch('http://localhost:3000/api/cron/daily-bill', {
            headers: {
                'Authorization': `Bearer ${process.env.CRON_SECRET}`
            }
        });

        const status = response.status;
        const data = await response.json();

        console.log(`\nStatus Code: ${status}`);
        if (status === 200) {
            console.log("SUCCESS: The midnight agent was triggered successfully.");
            console.log("Details:", JSON.stringify(data, null, 2));
        } else {
            console.log("FAILED: The trigger was unauthorized or failed.");
            console.log("Response:", data);
        }

    } catch (e) {
        console.error("CRITICAL ERROR: Is your local server running? (npm run dev)");
        console.error(e.message);
    }
}

verifyMidnightTrigger();
