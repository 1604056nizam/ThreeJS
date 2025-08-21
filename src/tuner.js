import * as THREE from 'three';

export function attachRendererTuner({renderer, scene, camera, composer}) {
    // --- DOM ---------------------------------------------------------------
    const panel = document.createElement('div');
    panel.id = 'renderer-tuner';
    panel.style.cssText = `
    position:fixed; right:12px; top:12px; z-index:9999;
    width:280px; padding:10px; border-radius:10px;
    background:rgba(12,14,22,.9); color:#e8eefc; font:13px/1.25 system-ui;
    border:1px solid rgba(255,255,255,.08); box-shadow:0 10px 30px rgba(0,0,0,.3);
  `;
    panel.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
      <strong>Renderer Tuner</strong>
      <button id="rt-hide" style="background:transparent;color:#9fb3ff;border:none;cursor:pointer">hide</button>
    </div>

    <label>Pixel Ratio (desktop)
      <input id="rt-pr" type="range" min="0.5" max="2" step="0.1" value="${Math.min(window.devicePixelRatio, 2)}">
      <span id="rt-pr-val"></span>
    </label><br/>

    <label>Tone Mapping
      <select id="rt-tm">
        <option value="None">None</option>
        <option value="Linear">Linear</option>
        <option value="Reinhard">Reinhard</option>
        <option value="Cineon">Cineon</option>
        <option value="ACES" selected>ACES</option>
      </select>
    </label><br/>

    <label>Exposure
      <input id="rt-exp" type="range" min="0" max="2" step="0.01" value="${renderer.toneMappingExposure ?? 1}">
      <span id="rt-exp-val"></span>
    </label><br/>

    <label>Shadows
      <select id="rt-shadows">
        <option value="off">Off</option>
        <option value="pcf">PCF</option>
        <option value="pcfsoft" selected>PCFSoft</option>
      </select>
    </label><br/>

    <label>XR Scale Factor (VR)
      <input id="rt-xrscale" type="range" min="0.75" max="1.25" step="0.01" value="1.0">
      <span id="rt-xrscale-val"></span>
    </label>

    <div style="opacity:.75;margin-top:8px">Press <b>T</b> to toggle panel.</div>
  `;
    document.body.appendChild(panel);

    const $ = (id) => panel.querySelector(id);
    const pr = $('#rt-pr'), prVal = $('#rt-pr-val');
    const tm = $('#rt-tm');
    const exp = $('#rt-exp'), expVal = $('#rt-exp-val');
    const sh = $('#rt-shadows');
    const xr = $('#rt-xrscale'), xrVal = $('#rt-xrscale-val');

    // display initial numbers
    const refreshLabels = () => {
        prVal.textContent = ` ${Number(pr.value).toFixed(2)}`;
        expVal.textContent = ` ${Number(exp.value).toFixed(2)}`;
        xrVal.textContent = ` ${Number(xr.value).toFixed(2)}`;
    };
    refreshLabels();

    // --- Helpers -----------------------------------------------------------
    const toneMapEnum = {
        None: THREE.NoToneMapping,
        Linear: THREE.LinearToneMapping,
        Reinhard: THREE.ReinhardToneMapping,
        Cineon: THREE.CineonToneMapping,
        ACES: THREE.ACESFilmicToneMapping,
    };

    function safeResize() {
        if (!renderer.xr.isPresenting) {
            renderer.setSize(window.innerWidth, window.innerHeight);
        }
        // your app already calls applySizesForCurrentTarget(); keep doing that after this
    }

    // --- Wire up controls --------------------------------------------------
    pr.addEventListener('input', () => {
        refreshLabels();
        if (renderer.xr.isPresenting) return; // forbidden in XR
        renderer.setPixelRatio(Number(pr.value));
        safeResize();
    });

    tm.addEventListener('change', () => {
        renderer.toneMapping = toneMapEnum[tm.value];
    });

    exp.addEventListener('input', () => {
        refreshLabels();
        renderer.toneMappingExposure = Number(exp.value);
    });

    sh.addEventListener('change', () => {
        const v = sh.value;
        if (v === 'off') {
            renderer.shadowMap.enabled = false;
        } else {
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = (v === 'pcf') ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
        }
    });

    let xrScale = 1.0;
    xr.addEventListener('input', () => {
        refreshLabels();
        xrScale = Number(xr.value);
        // Apply immediately if in XR
        if (renderer.xr.isPresenting) {
            renderer.xr.setFramebufferScaleFactor(xrScale);
        }
    });

    $('#rt-hide').addEventListener('click', () => panel.style.display = 'none');
    window.addEventListener('keydown', (e) => {
        if (e.key.toLowerCase() === 't') {
            panel.style.display = (panel.style.display === 'none') ? 'block' : 'none';
        }
    });

    // Reapply XR scale on session start/end
    renderer.xr.addEventListener('sessionstart', () => {
        renderer.xr.setFramebufferScaleFactor(xrScale);
    });
}
