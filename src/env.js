import {PMREMGenerator} from 'three';
import {RGBELoader} from 'three/examples/jsm/loaders/RGBELoader.js';

export async function applyHDRI(renderer, scene, url, opts = {background: false}) {
    const pmrem = new PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    const hdr = await new RGBELoader().loadAsync(url);
    const ibl = pmrem.fromEquirectangular(hdr).texture;
    hdr.dispose();
    pmrem.dispose();
    scene.environment = ibl;
    if (opts.background) scene.background = ibl;
}
