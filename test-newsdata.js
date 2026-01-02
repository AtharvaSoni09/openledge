require('dotenv').config({ path: '.env.local' });

async function testNewsData() {
    const apiKey = process.env.NEWSDATA_API_KEY;
    console.log("NewsData API Key present:", !!apiKey);

    try {
        const url = `https://newsdata.io/api/1/news?apikey=${apiKey}&q=legislation&language=en&size=1`;
        console.log("Testing NewsData with URL:", url);

        const res = await fetch(url);
        console.log("Response status:", res.status);

        const data = await res.json();
        console.log("✅ NewsData SUCCESS");
        console.log("Sample data:", JSON.stringify(data).slice(0, 200));
    } catch (error) {
        console.error("❌ NewsData FAILED:", error.message);
        console.error("Full error:", error);
    }
}

testNewsData();
