import * as THREE from 'three';
import {XRControllerModelFactory} from 'three/examples/jsm/webxr/XRControllerModelFactory.js';
import {loadGLTF} from './loader.js';

export class World {
    constructor() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0b1020);

        this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
        this.camera.position.set(0, 1.6, 3);

        // XR origin
        this.xrOrigin = new THREE.Group();
        this.xrOrigin.name = 'xr-origin';
        this.scene.add(this.xrOrigin);
        this.xrOrigin.add(this.camera);

        this.interactables = [];
        this.raycaster = new THREE.Raycaster();
        this.tempMat = new THREE.Matrix4();

        this._cube = null;
        this._modelRoot = null;
        this.modelUrl = null;
        this._blobUrl = null;
        this.modelLabel = null;
        this._renderer = null;

        this.modelStatsBefore = null;
    }

    init(renderer) {
        this._renderer = renderer;

        // Lights
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.18));

        const hemi = new THREE.HemisphereLight(0xffffff, 0x101018, 0.6);
        hemi.position.set(0, 20, 0);
        this.scene.add(hemi);

        const dir = new THREE.DirectionalLight(0xffffff, 1.2);
        dir.position.set(3, 6, 2);
        dir.castShadow = true;
        dir.shadow.mapSize.set(2048, 2048);
        dir.shadow.camera.near = 0.1;
        dir.shadow.camera.far = 25;
        dir.shadow.camera.left = -6;
        dir.shadow.camera.right = 6;
        dir.shadow.camera.top = 6;
        dir.shadow.camera.bottom = -6;
        dir.shadow.bias = -0.00015;
        dir.shadow.normalBias = 0.02;
        this.scene.add(dir);

        // Floor
        const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(20, 20),
            new THREE.MeshStandardMaterial({color: 0x5a617a, metalness: 0.0, roughness: 0.9})
        );
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);

        // Fallback cube
        // const colors = [0xff5555, 0x55ff99, 0x5599ff, 0xffff66];
        // let colorIndex = 0;
        // const cube = new THREE.Mesh(
        //     new THREE.BoxGeometry(0.4, 0.4, 0.4),
        //     new THREE.MeshStandardMaterial({ color: colors[colorIndex], metalness: 0.05, roughness: 0.5 })
        // );
        // cube.position.set(0, 1.2, -1.2);
        // cube.castShadow = true;
        // this.scene.add(cube);
        // this.interactables.push(cube);
        // this._cube = cube;
        // this._toggleCube = () => {
        //     colorIndex = (colorIndex + 1) % colors.length;
        //     cube.material.color.setHex(colors[colorIndex]);
        // };

        // Shiny sphere
        // const shiny = new THREE.Mesh(
        //     new THREE.SphereGeometry(0.25, 64, 32),
        //     new THREE.MeshStandardMaterial({ metalness: 1.0, roughness: 0.05 })
        // );
        // shiny.position.set(0.7, 0.35, -1.2);
        // shiny.castShadow = shiny.receiveShadow = true;
        // this.scene.add(shiny);

        // Grid
        this.scene.add(new THREE.GridHelper(10, 10));

        // Controllers
        this._setupControllers(renderer);
    }

    _computeSceneStats(root) {
        let tris = 0, verts = 0;
        root.traverse((o) => {
            if (o.isMesh && o.geometry) {
                const g = o.geometry;
                const pos = g.getAttribute('position');
                if (pos) verts += pos.count;
                if (g.index) tris += Math.floor(g.index.count / 3);
                else if (pos) tris += Math.floor(pos.count / 3);
            }
        });
        return {triangles: tris, vertices: verts};
    }

    setWireframe(enabled) {
        this._modelRoot?.traverse?.((o) => {
            if (o.isMesh && o.material) {
                if (Array.isArray(o.material)) {
                    o.material.forEach((m) => {
                        m.wireframe = enabled;
                        m.needsUpdate = true;
                    });
                } else {
                    o.material.wireframe = enabled;
                    o.material.needsUpdate = true;
                }
            }
        });
    }

    async previewGLB(arrayBuffer) {
        try {
            const blob = new Blob([arrayBuffer], {type: 'model/gltf-binary'});
            const url = URL.createObjectURL(blob);
            const gltf = await loadGLTF(url);
            URL.revokeObjectURL(url);
            const newRoot = gltf.scene;
            newRoot.traverse(o => {
                if (o.isMesh) {
                    o.castShadow = true;
                    o.receiveShadow = true;
                }
            });
            if (this._modelRoot) this.scene.remove(this._modelRoot);
            newRoot.position.set(0, 0.0, -1.4);
            newRoot.scale.setScalar(1.0);
            this.scene.add(newRoot);
            this._modelRoot = newRoot;

            // Update "before" stats to reflect the simplified model for display
            this.modelStatsBefore = this._computeSceneStats(newRoot);
        } catch (e) {
            console.error('Preview GLB failed', e);
        }
    }

    async addModelFromURL(url, opts = {}) {
        try {
            this.clearModels();
            const gltf = await loadGLTF(url);
            const root = gltf.scene;
            root.traverse(o => {
                if (o.isMesh) {
                    o.castShadow = true;
                    o.receiveShadow = true;
                }
            });
            root.position.set(0, 0, -1.4);
            if (opts.position) root.position.copy(opts.position);
            if (opts.scale) root.scale.setScalar(opts.scale);
            this.scene.add(root);
            this._modelRoot = root;
            this.modelUrl = url;
            this.modelLabel = (opts.name) ? opts.name : (typeof url === 'string' ? url.split('/').pop() : 'model.glb');
            this.modelStatsBefore = this._computeSceneStats(root);

            return root;
        } catch (e) {
            console.error('addModelFromURL failed', e);
        }
    }

    async addModelFromArrayBuffer(arrayBuffer, opts = {}) {
        try {
            this.clearModels();
            const blob = new Blob([arrayBuffer], {type: 'model/gltf-binary'});
            const url = URL.createObjectURL(blob);
            const gltf = await loadGLTF(url);
            this._blobUrl = url; // keep alive
            const root = gltf.scene;
            root.traverse(o => {
                if (o.isMesh) {
                    o.castShadow = true;
                    o.receiveShadow = true;
                }
            });
            root.position.set(0, 0, -1.4);
            this.scene.add(root);
            this._modelRoot = root;
            this.modelUrl = url;
            this.modelLabel = opts.name || 'local.glb';

            // compute initial stats
            this.modelStatsBefore = this._computeSceneStats(root);

            return root;
        } catch (e) {
            console.error('addModelFromArrayBuffer failed', e);
        }
    }

    clearModels() {
        if (this._modelRoot) {
            this.scene.remove(this._modelRoot);
            this._modelRoot = null;
        }
        if (this._blobUrl) {
            URL.revokeObjectURL(this._blobUrl);
            this._blobUrl = null;
        }
        this.modelUrl = null;
        this.modelLabel = null;
        this.modelStatsBefore = null;
    }

    frameAll(camera, controls) {
        if (!this._modelRoot) return;
        const box = new THREE.Box3().setFromObject(this._modelRoot);
        const center = new THREE.Vector3();
        box.getCenter(center);
        const size = new THREE.Vector3();
        box.getSize(size);
        const radius = Math.max(size.x, size.y, size.z) * 0.5 || 1;
        const dist = radius / Math.tan((camera.fov * Math.PI / 180) / 2);
        camera.position.set(center.x, center.y + radius * 0.6, center.z + dist * 1.2);
        camera.updateProjectionMatrix();
        controls?.setTarget(center.x, center.y, center.z);
    }

    _setupControllers(renderer) {
        const factory = new XRControllerModelFactory();

        const addControllerRay = (controller) => {
            const rayGeom = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(0, 0, 0),
                new THREE.Vector3(0, 0, -1)
            ]);
            const ray = new THREE.Line(rayGeom, new THREE.LineBasicMaterial({transparent: true, opacity: 0.6}));
            ray.scale.z = 2;
            controller.add(ray);
        };

        const onSelectStart = (e) => {
            const controller = e.target;
            this.tempMat.identity().extractRotation(controller.matrixWorld);
            this.raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
            this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(this.tempMat);
            const hits = this.raycaster.intersectObjects(this.interactables, false);
            if (hits[0] && hits[0].object === this._cube) {
                this._toggleCube();
                this._hapticPulse(controller, 0.6, 25);
            }
        };

        const grip1 = renderer.xr.getControllerGrip(0);
        const grip2 = renderer.xr.getControllerGrip(1);
        grip1.add(factory.createControllerModel(grip1));
        grip2.add(factory.createControllerModel(grip2));
        this.xrOrigin.add(grip1, grip2);

        const c0 = renderer.xr.getController(0);
        const c1 = renderer.xr.getController(1);
        c0.addEventListener('selectstart', onSelectStart);
        c1.addEventListener('selectstart', onSelectStart);
        addControllerRay(c0);
        addControllerRay(c1);

        this.xrOrigin.add(c0, c1);
    }

    _hapticPulse(controller, strength = 0.5, duration = 20) {
        const gp = controller.gamepad;
        const act = gp && (gp.hapticActuators?.[0] || gp.vibrationActuator);
        try {
            act?.pulse ? act.pulse(strength, duration)
                : act?.playEffect?.('dual-rumble', {duration, strongMagnitude: strength});
        } catch {
        }
    }

    update(_time, _frame) {
    }
}
