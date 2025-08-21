import * as THREE from 'three';

export const Presets = {
    baseline: {postFX: false, xrScale: 1.0, shadows: 'pcfsoft'},
    quality: {postFX: true, xrScale: 1.1, shadows: 'pcfsoft'},
    fast: {postFX: false, xrScale: 0.9, shadows: 'pcf'},
    reverbG2: {postFX: false, xrScale: 0.9, shadows: 'pcfsoft'}
};

export function applyPreset({preset, renderer}) {
    renderer.xr.setFramebufferScaleFactor(preset.xrScale);
    if (preset.shadows === 'off') {
        renderer.shadowMap.enabled = false;
    } else {
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = (preset.shadows === 'pcf') ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
    }
}
