require('dotenv').config({ path: '.env.local' });

async function testOpenFEC() {
    const apiKey = process.env.OPENFEC_API_KEY;
    console.log("OpenFEC API Key present:", !!apiKey);

    try {
        const url = `https://api.open.fec.gov/v1/candidates/search/?api_key=${apiKey}&name=Biden&page=1&per_page=1`;
        console.log("Testing OpenFEC with URL:", url);

        const res = await fetch(url);
        console.log("Response status:", res.status);

        const data = await res.json();
        console.log("✅ OpenFEC SUCCESS");
        console.log("Sample data:", JSON.stringify(data).slice(0, 200));
    } catch (error) {
        console.error("❌ OpenFEC FAILED:", error.message);
        console.error("Full error:", error);
    }
}

testOpenFEC();
