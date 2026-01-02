
const OpenAI = require("openai");
require('dotenv').config({ path: '.env.local' });

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

async function verify() {
    console.log("Testing OpenAI Key with model: gpt-4o-mini");
    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "You are a helpful assistant." },
                { role: "user", content: "Hello world" }
            ],
        });
        console.log("✅ OpenAI Success!");
        console.log("Response:", completion.choices[0].message.content);
    } catch (e) {
        console.error("❌ OpenAI Failed:");
        if (e.response) {
            console.error("Status:", e.status);
            console.error("Data:", e.response.data);
        } else {
            console.error(e.message);
        }
    }
}

verify();
