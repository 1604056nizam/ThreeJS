import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import * as THREE from 'three';


export class DesktopControls {
    constructor(camera, domElement, opts ={}) {
        this.camera = camera;
        this.domElement = domElement;
        this.enabled = true;

        this.moveSpeed = opts.moveSpeed ?? 1.5;
        this.wheelSpeed = opts.wheelSpeed ?? 1.0;
        this.rotateSpeed = opts.rotateSpeed ?? .002;

        //state
        this._keys = new Set();
        this._dragging = false;
        this._prev = {
            x: 0,
            y: 0
        };

        //Initialize yaw/pitch from camera
        const e = new THREE.Euler().setFromQuaternion(this.camera.quaternion, 'YXZ');
        this._yaw = e.y;
        this._pitch = e.x;


        //Bindings
        this._onKeyDown = (ev) => this._handleKey(ev, true);
        this._onKeyUp = (ev) => this._handleKey(ev, false);
        this._onMouseDown = (ev) => {if (ev.button === 0) {this._dragging = true; this._prev.x = ev.clientX; this._prev.y = ev.clientY}};
        this._onMouseUp = (ev) => {this._dragging = false;};
        this._onMouseMove = (ev) => {
            if (!this.enabled || this._dragging !== true) {
                return;
            }

            const dx = ev.clientX - this._prev.x;
            const dy = ev.clientY - this._prev.y;
            this._prev.x = ev.clientX;
            this._prev.y = ev.clientY;
            this._yaw -= dx * this.rotateSpeed;
            this._pitch -= dy * this.rotateSpeed;
            const EPS = 1e-3, MAX = Math.PI / 2 - EPS;
            this._pitch = Math.max(-MAX, Math.min(MAX, this._pitch));
            const euler = new THREE.Euler(this._pitch, this._yaw, 0, 'YXZ');
            this.camera.quaternion.setFromEuler(euler);
        };

        this._onWheel = (ev) => {
            if (!this.enabled) return;
            ev.preventDefault();
            const dir = Math.sign(ev.deltaY);
            const step = dir * this.wheelSpeed;
            const fwd = new THREE.Vector3();
            this.camera.getWorldDirection(fwd);
            this.camera.position.addScaledVector(fwd, step * -1);
        };

        //Listeners
        window.addEventListener('keydown', this._onKeyDown);
        window.addEventListener('keyup', this._onKeyUp);
        this.domElement.addEventListener('mousedown', this._onMouseDown);
        window.addEventListener('mouseup', this._onMouseUp);
        window.addEventListener('mousemove', this._onMouseMove);
        this.domElement.addEventListener('wheel', this._onWheel, { passive: false });
    }

    _handleKey(ev, down) {
        const tag = (ev.target && ev.target.tagName) ? ev.target.tagName.toLocaleLowerCase() : '';

        if (tag === 'input' || tag === 'textarea' || tag === 'select') {
            return;
        }

        const k = ev.key.toLowerCase();

        if (down) {
            this._keys.add(k);
        } else {
            this._keys.delete(k);
        }

    }

    _getBasis() {
        const q = this.camera.quaternion;
        const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(q).normalize(); // camera forward
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(q).normalize();  // camera right
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(q).normalize();  // camera up
        return {fwd, right, up};
    }


    update(isXR, dtSec = 0) {
        if (!this.enabled || isXR) return;
        const step = this.moveSpeed * dtSec;
        if (step <= 0) return;

        const {fwd, right, up} = this._getBasis();
        const move = new THREE.Vector3();

        // Keys mapped to camera-local axes
        if (this._keys.has('a')) move.addScaledVector(right,-1); // left
        if (this._keys.has('d')) move.addScaledVector(right,1); // right
        if (this._keys.has('w')) move.addScaledVector(fwd,1); // forward
        if (this._keys.has('s')) move.addScaledVector(fwd,-1); // back
        if (this._keys.has('e')) move.addScaledVector(up,1); // up
        if (this._keys.has('q')) move.addScaledVector(up,-1); // down

        if (move.lengthSq() > 0) {
            move.normalize().multiplyScalar(step);
            this.camera.position.add(move);
        }
    }

    dispose() {
        window.removeEventListener('keydown', this._onKeyDown);
        window.removeEventListener('keyup', this._onKeyUp);
        this.domElement.removeEventListener('mousedown', this._onMouseDown);
        window.removeEventListener('mouseup', this._onMouseUp);
        window.removeEventListener('mousemove', this._onMouseMove);
        this.domElement.removeEventListener('wheel', this._onWheel);
    }


}