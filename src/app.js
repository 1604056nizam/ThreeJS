import * as THREE from 'three';
import {VRButton} from 'three/examples/jsm/webxr/VRButton.js';
import {RendererService} from './renderer.js';
import {World} from './world.js';
import {PostFXPipeline} from './postfx.js';
import {MetricsLogger} from './metrics.js';
import {attachRendererTuner} from './tuner.js';
import {attachDecimatePanel} from "./decimator/decimatePanel";
import {Decimator} from "./decimator/decimate";
import {Presets, applyPreset} from './ab.js';
import {initLLM, setContext, askLLM} from './llm.js';
import {DesktopControls} from "./movement/controls";
import {XRLocomotion} from "./movement/xrLocomotion";

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
        this.locomotion = null;
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

        //VR Locomotion
        this.locomotion = new XRLocomotion(renderer, this.world, {speed: 1.6, deadzone: .15});

        // Desktop Orbit control
        this.controls = new DesktopControls(this.world.camera, renderer.domElement,{moveSpeed: 1.5, wheelSpeed: 0.5, rotateSpeed: 0.002});

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

        // Including the triangle count in the huds
        this.metrics.setExternalStatsProvider(() => renderer.info.render);

        const decimator = new Decimator();
        attachDecimatePanel({
            getSource: () => this.world.modelURL,
            onPreview: async ({ratio, error, wireframe}) => {
                const res = await decimator.decimateURL({url: this.world.modelURL, ratio, error});
                await this.world.previewGLB(res.glb);
                this.world.setWireframe(!!wireframe);
                return res; // for panel stats
            },
            onDownload: async ({ratio, error}) => {
                const res = await decimator.decimateURL({url: this.world.modelURL, ratio, error});
                const name = `simplified_${Math.round(ratio * 100)}.glb`;
                Decimator.downloadGLB(res.glb, name);
                return res;
            },
            onWireframe: (enabled) => this.world.setWireframe(!!enabled)
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
        let lastTime = 0;
        renderer.setAnimationLoop((time, frame) => {
            const dt = lastTime ? (time - lastTime) / 1000 : 0;
            lastTime = time;

            this.metrics.tick(time);
            this.world.update(time, frame);

            const isXR = renderer.xr.isPresenting;
            this.controls.update(isXR, dt);
            this.locomotion.update(dt);

            if (this.PP_ENABLED) {
                this.postfx.render(isXR);
            } else {
                renderer.render(this.world.scene, this.world.camera)
            }
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
