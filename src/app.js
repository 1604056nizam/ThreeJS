import * as THREE from 'three';
import {VRButton} from 'three/examples/jsm/webxr/VRButton.js';
import {RendererService} from './renderer.js';
import {World} from './world.js';
import {PostFXPipeline} from './postfx.js';
import {MetricsLogger} from './metrics.js';
import {attachRendererTuner} from './tuner.js';
import {Presets, applyPreset} from './ab.js';
import {initLLM, setContext, askLLM} from './llm.js';
import {DesktopControls} from "./orbitControl";

export class App {
    constructor({container}) {
        this.container = container;
        this.rendererSvc = null;
        this.world = null;
        this.postfx = null;
        this.metrics = new MetricsLogger(90); // HP Reverb G2 target
        this.PP_ENABLED = true; // desktop default; XR will force off
        this._llmReady = false;
        this.controls = null;
    }

    start() {
        // Renderer
        this.rendererSvc = new RendererService();
        const renderer = this.rendererSvc.init(this.container);

        // VR button
        document.body.appendChild(VRButton.createButton(renderer));

        // World
        this.world = new World();
        this.world.init(renderer);

        // Desktop Orbit control
        this.controls = new DesktopControls(this.world.camera, renderer.domElement);
        this.controls.setTarget(0, 1.2, -1.2);

        // PostFX
        this.postfx = new PostFXPipeline(renderer, this.world.scene, this.world.camera);

        // Initial sizing
        this._applySizesForCurrentTarget();

        // Tuner UI
        attachRendererTuner({
            renderer,
            scene: this.world.scene,
            camera: this.world.camera,
            composer: this.postfx.composer
        });

        // Resize
        window.addEventListener('resize', () => {
            this.world.camera.aspect = window.innerWidth / window.innerHeight;
            this.world.camera.updateProjectionMatrix();
            if (!renderer.xr.isPresenting) {
                renderer.setSize(window.innerWidth, window.innerHeight);
            }
            this._applySizesForCurrentTarget();
        });

        // XR session events
        renderer.xr.addEventListener('sessionstart', () => {
            this._applySizesForCurrentTarget();
            applyPreset({preset: Presets.reverbG2, renderer});
            this.PP_ENABLED = false; // XR: keep off by default for perf
            this.controls.enabled = false;
        });
        renderer.xr.addEventListener('sessionend', () => {
            renderer.setSize(window.innerWidth, window.innerHeight);
            this._applySizesForCurrentTarget();
            this.PP_ENABLED = true; // desktop: allow
            this.controls.enabled = true;
        });

        // Keyboard toggle for postFX
        window.addEventListener('keydown', (e) => {
            const k = e.key.toLocaleLowerCase();
            if (k === 'p') {
                this.PP_ENABLED = !this.PP_ENABLED;
                console.log('PostFX:', this.PP_ENABLED ? 'on' : 'off');
            }

            if(k === 'o') {
                this.controls.enabled = !this.controls.enabled;
                console.log('OrbitControls:', this.controls.enabled ? 'on' : 'off');
            }
        });

        // LLM UI wiring (non-blocking)
        this._wireLLM();

        // Main loop
        renderer.setAnimationLoop((time, frame) => {
            this.metrics.tick(time);
            this.world.update(time, frame);
            const isXR = renderer.xr.isPresenting;
            this.controls.update(isXR);
            if (this.PP_ENABLED) this.postfx.render(isXR); else renderer.render(this.world.scene, this.world.camera);
        });
    }

    _applySizesForCurrentTarget() {
        const {renderer} = this.rendererSvc;
        const size = new THREE.Vector2();
        if (renderer.xr.isPresenting) {
            renderer.getDrawingBufferSize(size);
        } else {
            renderer.getSize(size);
        }
        this.postfx.setSize(size.x, size.y, renderer.xr.isPresenting);
    }

    async _wireLLM() {
        const statusEl = document.getElementById('llm-status');
        const body = document.getElementById('chat-body');
        const input = document.getElementById('chat-text');
        const sendBtn = document.getElementById('chat-send');
        const fab = document.getElementById('chat-fab');
        const popup = document.getElementById('chat-popup');

        const addMsg = (text, who) => {
            const div = document.createElement('div');
            div.className = who === 'user' ? 'msg-user' : 'msg-bot';
            div.textContent = text;
            body.appendChild(div);
            body.scrollTop = body.scrollHeight;
        };

        fab?.addEventListener('click', () => {
            popup.style.display = popup.style.display === 'flex' ? 'none' : 'flex';
            if (popup.style.display === 'flex') input?.focus();
        });

        try {
            statusEl.textContent = ' • loading…';
            await initLLM((p) => {
                statusEl.textContent = ` • downloading ${Math.round((p.progress || 0) * 100)}%`;
            });
            setContext(
                `App: Three.js + WebXR training sandbox.\nScene: a cube at (0,1.2,-1.2), hemisphere + directional lights, floor plane.\nGoal: help the user modify the scene (explain steps, materials, VR controls).\nIf asked for code, focus on short, copy‑pasteable snippets for this project structure.`
            );
            statusEl.textContent = ' • ready';
            this._llmReady = true;
        } catch (e) {
            statusEl.textContent = ' • init failed';
        }

        const send = async () => {
            if (!this._llmReady) {
                addMsg('Model not ready yet…', 'bot');
                return;
            }
            const q = input.value.trim();
            if (!q) return;
            addMsg(q, 'user');
            input.value = '';
            addMsg('Thinking…', 'bot');
            try {
                const reply = await askLLM(q);
                body.lastChild.textContent = reply;
            } catch (e) {
                body.lastChild.textContent = 'Error: ' + e.message;
            }
        };

        sendBtn?.addEventListener('click', send);
        input?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
            }
        });
    }
}
