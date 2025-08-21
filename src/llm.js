import {CreateMLCEngine} from "@mlc-ai/web-llm";

const MODEL_NAME = "Llama-3.2-1B-Instruct-q4f32_1-MLC";

let engine = null;

let history = [];

export async function initLLM(onProgress = () => {
}) {
    if (engine) return engine;
    engine = await CreateMLCEngine(MODEL_NAME, {
        initProgressCallback: (p) => onProgress(p),
    });
    return engine;
}

let systemContext = [];
let conversation = [];

export function setContext(contextText) {
    const combined = [
        "You are a helpful assistant for a Three.js + WebXR app.",
        "Answer concisely with short, copy‑pasteable tips for this project.",
        "Scene facts:",
        contextText
    ].join("\n");

    systemContext = [{role: "system", content: combined}];
    conversation = [];
}

export async function askLLM(userText) {
    if (!engine) throw new Error("LLM not initialized");

    const messages = [...systemContext, ...conversation, {role: "user", content: userText}];
    const res = await engine.chat.completions.create({messages});
    const reply = res.choices[0].message.content;

    conversation.push({role: "user", content: userText});
    conversation.push({role: "assistant", content: reply});
    return reply;
}
