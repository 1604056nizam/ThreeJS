import * as THREE from 'three'
import {XRControllerModelFactory} from 'three/examples/jsm/webxr/XRControllerModelFactory.js'
import {loadGLTF} from './loader'   // keep your loader; note path tip below

export function createScene() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b1020);

    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 1.6, 3);

    // --- LIGHTS (natural base + sun + tiny fill) ---
    scene.add(new THREE.AmbientLight(0xffffff, 0.18)); // tiny global fill

    const hemi = new THREE.HemisphereLight(0xffffff, 0x101018, 0.6);// stronger + warmer ground
    hemi.position.set(0, 20, 0);
    scene.add(hemi);

    const dir = new THREE.DirectionalLight(0xffffff, 1.2); // a bit brighter for VR
    dir.position.set(3, 6, 2);
    dir.castShadow = true;
    dir.shadow.mapSize.set(2048, 2048);     // sharper shadows
    dir.shadow.camera.near = 0.1;
    dir.shadow.camera.far = 25;
    dir.shadow.camera.left = -6;
    dir.shadow.camera.right = 6;
    dir.shadow.camera.top = 6;
    dir.shadow.camera.bottom = -6;
    dir.shadow.bias = -0.00015;           // reduce shadow acne
    dir.shadow.normalBias = 0.02;
    scene.add(dir);

    // --- FLOOR (teleportable, shadow receiver) ---
    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(20, 20),
        new THREE.MeshStandardMaterial({color: 0xCADECF, metalness: 0.0, roughness: 0.9})
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // --- GLTF (PBR needs IBL to look “real”) ---
    (async () => {
        try {
            // IMPORTANT: from code, static files are under / (public/)
            const gltf = await loadGLTF('/assets/DamagedHelmet.glb')
            const model = gltf.scene;
            model.traverse(o => {
                if (o.isMesh && o.material && o.material.isMeshStandardMaterial) {
                    // soften specular
                    o.material.roughness = Math.min(1.0, (o.material.roughness ?? 0.4) + 0.15);
                    o.material.metalness = Math.max(0.0, (o.material.metalness ?? 0.9) - 0.15);

                    // reduce reflections from HDRI
                    o.material.envMapIntensity = 0.7; // try 0.5–0.8

                    // if it glows, clamp emissive a bit
                    if ('emissiveIntensity' in o.material) {
                        o.material.emissiveIntensity = Math.min(0.5, o.material.emissiveIntensity ?? 0.5);
                    }

                    o.material.needsUpdate = true;
                }
            })
            model.position.set(0, 0.0, -1.4); // push a bit forward
            model.scale.setScalar(1.0);
            scene.add(model)
        } catch (e) {
            console.error('Failed to load GLTF', e)
        }
    })();

    // --- Controllers (unchanged except removed colorIndex you weren’t using) ---
    function addController(index, renderer) {
        const controller = renderer.xr.getController(index);
        scene.add(controller);

        const rayGeom = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, -1)
        ]);
        const ray = new THREE.Line(rayGeom, new THREE.LineBasicMaterial());
        ray.scale.z = 2;
        controller.add(ray);
    }

    function setRenderer(renderer) {
        const factory = new XRControllerModelFactory();
        const grip1 = renderer.xr.getControllerGrip(0);
        const grip2 = renderer.xr.getControllerGrip(1);
        grip1.add(factory.createControllerModel(grip1));
        grip2.add(factory.createControllerModel(grip2));
        scene.add(grip1, grip2);

        addController(0, renderer);
        addController(1, renderer);
    }

    const update = () => {
    };

    return {scene, camera, update, setRenderer}
}
