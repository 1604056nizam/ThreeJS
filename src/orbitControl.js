import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';


export class DesktopControls {
    constructor(camera, domElement) {
        this.controls = new OrbitControls(camera, domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.08;
        this.controls.screenSpacePanning = true; // shift+drag pans; right-drag also
        this.controls.minDistance = 0.2;
        this.controls.maxDistance = 20;
        this.controls.maxPolarAngle = Math.PI * 0.49; // don't go below ground too much
        this.enabled = true;
    }

    setTarget(x, y, z) {
        this.controls.target.set(x, y, z);
        this.controls.update();
    }

    update(isXR) {
        // Disable in XR; HMD controls the camera
        this.controls.enabled = this.enabled && !isXR;
        if (this.controls.enabled) this.controls.update();
    }

    dispose() {
        this.controls.dispose();
    }
}