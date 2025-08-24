import * as THREE from 'three';

export class XRLocomotion {
    constructor(renderer, world, opts = {}) {
        this.renderer = renderer;
        this.world = world;
        this.speed = opts.speed ?? 1.6;
        this.deadzone = opts.deadzone ?? 0.15;
        this.tmpFwd = new THREE.Vector3();
        this.tmpRight = new THREE.Vector3();
        this.UP = new THREE.Vector3(0, 1, 0);
    }


    update(dt) {
        const xr = this.renderer.xr;
        if (!xr.isPresenting) return;
        const {x, y} = this._getLeftStick();
        if (x === 0 && y === 0) return;


        const xrCam = xr.getCamera(this.world.camera);
        this.tmpFwd.set(0, 0, -1).applyQuaternion(xrCam.quaternion);
        this.tmpFwd.y = 0;
        if (this.tmpFwd.lengthSq() === 0) return;
        this.tmpFwd.normalize();


        this.tmpRight.crossVectors(this.tmpFwd, this.UP).normalize();


        const move = new THREE.Vector3();
        move.addScaledVector(this.tmpRight, x);
        move.addScaledVector(this.tmpFwd, y);
        if (move.lengthSq() > 0) {
            move.normalize().multiplyScalar(this.speed * dt);
            this.world.xrOrigin.position.add(move);
        }
    }


    _getLeftStick() {
        const session = this.renderer.xr.getSession();
        if (!session) return {x: 0, y: 0};


        let gp = null;
        for (const src of session.inputSources) {
            if (src?.handedness === 'left' && src.gamepad) {
                gp = src.gamepad;
                break;
            }
        }
        if (!gp) return {x: 0, y: 0};


        const ax = gp.axes || [];
        let x = 0, y = 0;
        if (ax.length >= 4) {
            x = ax[2];
            y = ax[3];
        } else if (ax.length >= 2) {
            x = ax[0];
            y = ax[1];
        }

        const dz = this.deadzone;
        x = (Math.abs(x) < dz) ? 0 : x;
        y = (Math.abs(y) < dz) ? 0 : -y;
        x = Math.max(-1, Math.min(1, x));
        y = Math.max(-1, Math.min(1, y));
        return {x, y};
    }
}