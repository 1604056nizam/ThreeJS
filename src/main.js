import * as THREE from 'three'
import {VRButton} from 'three/examples/jsm/webxr/VRButton.js'
import {createScene} from './scene.js'
import {attachRendererTuner} from './tuner';

import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer.js'
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass.js'
import {UnrealBloomPass} from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import {ShaderPass} from 'three/examples/jsm/postprocessing/ShaderPass.js'
import {FXAAShader} from 'three/examples/jsm/shaders/FXAAShader.js'

import {Vector2} from 'three'

const renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.xr.enabled = true;
renderer.xr.setReferenceSpaceType('local-floor');
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

document.getElementById('app').appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));


const {scene, camera, update, setRenderer} = createScene();
setRenderer?.(renderer);
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const bloom = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.25,
    0.4,
    0.9
);

composer.addPass(bloom);
const fxaa = new ShaderPass(FXAAShader);
composer.addPass(fxaa);

const size = new Vector2();

function setFXAAResolution(w, h) {
    if (renderer.xr.isPresenting) {
        fxaa.uniforms.resolution.value.set(1 / w, 1 / h);
    } else {
        const pr = Math.min(window.devicePixelRatio, 2);
        fxaa.uniforms.resolution.value.set(1 / (w * pr), 1 / (h * pr));
    }
}

function setBloomResolution(w, h) {
    bloom.setSize(w, h);
}

function applySizesForCurrentTarget() {
    if (renderer.xr.isPresenting) {
        renderer.getDrawingBufferSize(size);
    } else {
        renderer.getSize(size);
    }
    composer.setSize(size.x, size.y);
    setFXAAResolution(size.x, size.y);
    setBloomResolution(size.x, size.y);
}

applySizesForCurrentTarget();
attachRendererTuner({renderer, scene, camera, composer});


window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    if (!renderer.xr.isPresenting) {
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    applySizesForCurrentTarget();
});

let PP_ENABLED = true;

renderer.xr.addEventListener('sessionstart', () => {
    applySizesForCurrentTarget();
    PP_ENABLED = false;
});
renderer.xr.addEventListener('sessionend', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    applySizesForCurrentTarget();
    PP_ENABLED = false;
});

window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'p') {
        PP_ENABLED = !PP_ENABLED;
    }
});

renderer.setAnimationLoop((time, frame) => {
    update(time, frame);

    if (renderer.xr.isPresenting) {
        if (PP_ENABLED) composer.render();
        else renderer.render(scene, camera);
    } else {
        if (PP_ENABLED) composer.render();
        else renderer.render(scene, camera);
    }
});

/* =======================================================================
   WebLLM popup chat (unchanged, with ready gate)
   ======================================================================= */
import {initLLM, setContext, askLLM} from './llm.js'

let LLM_READY = false

// Popup toggle
const fab = document.getElementById('chat-fab')
const popup = document.getElementById('chat-popup')
fab.addEventListener('click', () => {
    popup.style.display = popup.style.display === 'flex' ? 'none' : 'flex'
    if (popup.style.display === 'flex') document.getElementById('chat-text').focus()
})

// Init LLM + preload context
const statusEl = document.getElementById('llm-status')
;(async () => {
    statusEl.textContent = ' • loading…'
    await initLLM((p) => {
        statusEl.textContent = ` • downloading ${Math.round((p.progress || 0) * 100)}%`
    })
    setContext(
        `App: Three.js + WebXR training sandbox.
Scene: a cube at (0,1.2,-1.2), hemisphere + directional lights, floor plane.
Goal: help the user modify the scene (explain steps, materials, VR controls).
If asked for code, focus on short, copy‑pasteable snippets for this project structure.`
    )
    statusEl.textContent = ' • ready'
    LLM_READY = true
})().catch(e => (statusEl.textContent = ' • init failed'))

// Chat send/receive
const body = document.getElementById('chat-body')
const input = document.getElementById('chat-text')
const sendBtn = document.getElementById('chat-send')

function addMsg(text, who) {
    const div = document.createElement('div')
    div.className = who === 'user' ? 'msg-user' : 'msg-bot'
    div.textContent = text
    body.appendChild(div)
    body.scrollTop = body.scrollHeight
}

async function send() {
    if (!LLM_READY) {
        addMsg('Model not ready yet…', 'bot')
        return
    }
    const q = input.value.trim()
    if (!q) return
    addMsg(q, 'user')
    input.value = ''
    addMsg('Thinking…', 'bot')
    try {
        const reply = await askLLM(q)
        body.lastChild.textContent = reply
    } catch (e) {
        body.lastChild.textContent = 'Error: ' + e.message
    }
}

sendBtn.addEventListener('click', send)
input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        send()
    }
})
