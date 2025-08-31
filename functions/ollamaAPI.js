import Anthropic from "@anthropic-ai/sdk";
import 'dotenv/config';

// Configuration
const SYSTEM_PROMPT = process.env.SYSTEM_PROMPT;
const API_NAME = process.env.AI_API;
const OLLAMA_MODEL = process.env.OLLAMA_MODEL;
const OLLAMA_URL = process.env.OLLAMA_URL;

// Initialize Anthropic client
const anthropic = new Anthropic({
    apiKey: process.env.CLAUDE_API_KEY,
    dangerouslyAllowBrowser: true,
});

async function askClaude(prompt) {
    const response = await anthropic.messages.create({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: prompt }],
    });

    return response.content[0].text
        .replace(/\n/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

async function askOllama(prompt) {
    const response = await fetch(OLLAMA_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: OLLAMA_MODEL,
            prompt: SYSTEM_PROMPT + prompt,
            stream: false,
        })
    });

    if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
    }

    const data = await response.json();
    return data.response
        .replace(/<think>[\s\S]*?<\/think>/g, '')
        .trim();
}

export async function askAI(prompt) {
    if (API_NAME === 'ollama') {
        try {
            return await askOllama(prompt);
        } catch {
            return await askClaude(prompt);
        }
    }

    if (API_NAME === 'claude') {
        return await askClaude(prompt);
    }

    throw new Error(`Unknown API: ${API_NAME}`);
}