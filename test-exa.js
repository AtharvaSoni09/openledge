require('dotenv').config({ path: '.env.local' });

async function testExa() {
    const apiKey = process.env.EXA_API_KEY;
    console.log("Exa API Key present:", !!apiKey);

    try {
        const url = 'https://api.exa.ai/search';
        console.log("Testing Exa with URL:", url);

        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey
            },
            body: JSON.stringify({
                query: 'test legislation',
                numResults: 1,
                useAutoprompt: true
            })
        });

        console.log("Response status:", res.status);

        const data = await res.json();
        console.log("✅ Exa SUCCESS");
        console.log("Sample data:", JSON.stringify(data).slice(0, 200));
    } catch (error) {
        console.error("❌ Exa FAILED:", error.message);
        console.error("Full error:", error);
    }
}

testExa();
