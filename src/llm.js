import {CreateMLCEngine, prebuiltAppConfig} from '@mlc-ai/web-llm';
let engine; let system = '';
export async function initLLM(onProgress) {
    //engine = await CreateMLCEngine({ model: 'Llama-3-8B-Instruct-q4f32_1-MLC', onDownloadProgress: onProgress });
    //const modelId = 'Phi-3.5-mini-instruct-q4f32_1-MLC';
    const modelId = "gemma-2-2b-it-q4f32_1-MLC-1k";
    //const modelId = 'Llama-3.2-1B-Instruct-q4f32_1-MLC';

    const baseURl = location.origin;
    console.log(baseURl);

    const localAppConfig = {
        ...prebuiltAppConfig,
        model_list: [
            {
                model_id: modelId,
                model_url: `${baseURl}/models/new/resolve/main/`,
                model_lib: `${baseURl}/models/new/resolve/main/libs/gemma-2-2b-it-q4f32_1-ctx4k_cs1k-webgpu.wasm`,
                low_resource_required: true,
                required_features: [],
                model: `${baseURl}/models/new/resolve/main/`
            },
        ],
    };

    engine = await CreateMLCEngine(
        modelId,
        {
            appConfig: localAppConfig,
            onDownloadProgress: onProgress,
        }
    );
}
export function setContext(text) { system = text || ''; }
export async function askLLM(q) {
    const messages = [ { role: 'system', content: system }, { role: 'user', content: q } ];
    const res = await engine.chat.completions.create({ messages, temperature: 0.2 });
    return res.choices?.[0]?.message?.content ?? '';
}
