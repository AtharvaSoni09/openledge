require('dotenv').config({ path: '.env.local' });
const { synthesizeLegislation } = require('./lib/agents/openai.ts');

async function test() {
    console.log("Testing OpenAI synthesis...");
    const result = await synthesizeLegislation(
        " H.R. 1234 - Test Bill",
        "Bill ID: HR1234\nType: hr\nOrigin: House\nSummary: Test Bill",
        { total: 10000 },
        { articles: [] },
        { results: [] }
    );
    console.log("Result:", result);
}

test().catch(console.error);
