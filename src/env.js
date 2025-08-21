import * as THREE from 'three'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js'

export async function applyHDRI(renderer, scene, url, { background = true } = {}) {
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();

    const tex = await new RGBELoader().loadAsync(url);
    tex.mapping = THREE.EquirectangularReflectionMapping;

    const { texture } = pmrem.fromEquirectangular(tex);
    tex.dispose();
    pmrem.dispose();

    scene.environment = texture;
    if (background) scene.background = texture;
}
