
const URL = "https://znlnbswqozizftapoixi.supabase.com/rest/v1/legislation?select=count";
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function testFetch() {
    console.log("Testing raw fetch to:", URL);
    try {
        const res = await fetch(URL, {
            headers: {
                "apikey": ANON_KEY,
                "Authorization": `Bearer ${ANON_KEY}`
            }
        });
        console.log("Status:", res.status);
        const data = await res.json();
        console.log("Data:", data);
    } catch (e) {
        console.error("Raw fetch FAILED:", e.message);
    }
}

testFetch();
