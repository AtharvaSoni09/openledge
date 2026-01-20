const OpenAI = require("openai");
require('dotenv').config({ path: '.env.local' });

const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;

console.log("Checking Groq API Key...");
console.log("Key present:", !!apiKey);
if (apiKey) {
    console.log("Key starts with:", apiKey.substring(0, 8) + "...");
}

const openai = new OpenAI({
    apiKey: apiKey,
    baseURL: "https://api.groq.com/openai/v1"
});

async function verify() {
    try {
        console.log("Sending test request to Groq...");
        const response = await openai.models.list();
        console.log("✅ Groq API Key is VALID. Connection success.");

        // Test a chat completion to be sure
        const completion = await openai.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "user", content: "Hello" }],
            max_tokens: 10
        });
        console.log("✅ Chat Completion Check:", completion.choices[0].message.content);

    } catch (error) {
        console.error("❌ Groq API Key is INVALID or Error occurred:");
        console.error(error.message);
        if (error.status) console.error("Status:", error.status);
    }
}

verify();
