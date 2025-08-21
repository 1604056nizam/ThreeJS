import { CreateMLCEngine } from '@mlc-ai/web-llm';
let engine; let system = '';
export async function initLLM(onProgress) {
    engine = await CreateMLCEngine({ model: 'Llama-3-8B-Instruct-q4f32_1-MLC', onDownloadProgress: onProgress });
}
export function setContext(text) { system = text || ''; }
export async function askLLM(q) {
    const messages = [ { role: 'system', content: system }, { role: 'user', content: q } ];
    const res = await engine.chat.completions.create({ messages, temperature: 0.2 });
    return res.choices?.[0]?.message?.content ?? '';
}
