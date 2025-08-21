import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/examples/jsm/loaders/DRACOLoader.js';

const gltfLoader = new GLTFLoader();
const draco = new DRACOLoader();
draco.setDecoderPath('/draco/'); // optional; add decoder files under public/draco/
gltfLoader.setDRACOLoader(draco);

export function loadGLTF(url) {
    return gltfLoader.loadAsync(url);
}
