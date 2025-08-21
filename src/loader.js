import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js'
import {DRACOLoader} from 'three/examples/jsm/loaders/DRACOLoader.js'

export async function loadGLTF(url) {
    const loader = new GLTFLoader();
    const draco = new DRACOLoader();
    draco.setDecoderPath('/draco/');
    loader.setDRACOLoader(draco);

    return await new Promise((resolve, reject) => {
        loader.load(url, (gltf) => resolve(gltf), undefined, reject);
    })
}
