
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const apiKey = process.env.CONGRESS_GOV_API_KEY;
const BASE_URL = 'https://api.congress.gov/v3';

async function testSort() {
    const urls = [
        `${BASE_URL}/bill?sort=updateDate+desc&format=json&limit=5&api_key=${apiKey}`,
        `${BASE_URL}/bill/119?format=json&limit=5&api_key=${apiKey}`,
        `${BASE_URL}/bill/118?format=json&limit=5&api_key=${apiKey}`
    ];

    for (const url of urls) {
        console.log(`\nTesting URL: ${url}`);
        const res = await fetch(url);
        const data = await res.json();
        if (data.bills) {
            console.log(`Results from ${url.split('?')[0]}:`);
            data.bills.forEach(b => console.log(`- [${b.congress}] ${b.type}${b.number}: ${b.title} (Updated: ${b.updateDate})`));
        } else {
            console.log(`No bills found or error:`, JSON.stringify(data).slice(0, 200));
        }
    }
}

testSort();
