import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        console.log("TEST: Starting minimal OpenAI test");

        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });

        console.log("TEST: OpenAI client created");

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "You are a helpful assistant. Return JSON only." },
                { role: "user", content: "Return a JSON object with fields: title (string), summary (string)" }
            ],
            response_format: { type: "json_object" }
        });

        console.log("TEST: OpenAI call succeeded");

        const content = completion.choices[0].message.content;
        return NextResponse.json({
            success: true,
            result: content ? JSON.parse(content) : null
        });

    } catch (error: any) {
        console.error("TEST ERROR:", error);
        console.error("TEST ERROR MESSAGE:", error.message);
        console.error("TEST ERROR STACK:", error.stack);
        return NextResponse.json({
            error: error.message,
            stack: error.stack,
            fullError: JSON.stringify(error, null, 2)
        }, { status: 500 });
    }
}
