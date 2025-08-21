import * as THREE from 'three';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import {ShaderPass} from 'three/examples/jsm/postprocessing/ShaderPass.js';
import {FXAAShader} from 'three/examples/jsm/shaders/FXAAShader.js';

export class PostFXPipeline {
    constructor(renderer, scene, camera) {
        this.r = renderer;
        this.scene = scene;
        this.camera = camera;
        this.composer = new EffectComposer(renderer);
        this.renderPass = new RenderPass(scene, camera);
        this.composer.addPass(this.renderPass);
        this.bloom = new UnrealBloomPass(undefined, 0.25, 0.4, 0.9);
        this.composer.addPass(this.bloom);
        this.fxaa = new ShaderPass(FXAAShader);
        this.composer.addPass(this.fxaa);
    }

    setSize(w, h, isXR) {
        this.composer.setSize(w, h);
        const pr = Math.min(window.devicePixelRatio, 2);
        const invW = 1 / (isXR ? w : w * pr);
        const invH = 1 / (isXR ? h : h * pr);
        this.fxaa.uniforms.resolution.value.set(invW, invH);
        this.bloom.setSize(w, h);
    }

    render(isXR) {
        // App decides whether PostFX is enabled. This just executes when asked.
        this.composer.render();
    }
}
