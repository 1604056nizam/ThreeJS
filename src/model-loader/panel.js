export function attachModelLoaderPanel(opts = {}) {
    const {fetchList, onLoadUrls, onLoadFiles, onClear, onFrame, onWireframe, onSwitch} = opts;
    const panel = document.createElement('div');
    panel.style.cssText = `position:fixed; left:12px; top:52px; z-index:9999; padding:12px; width:320px; border-radius:10px; background:rgba(12,14,22,.95); color:#e8eefc; font:13px system-ui; border:1px solid rgba(255,255,255,.08)`;
    panel.innerHTML = `
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
<strong>Model Loader (non-VR)</strong>
<div style="display:flex;align-items:center;gap:8px">
<label style="font-weight:normal;margin:0"><input id="ml-wire" type="checkbox"> Wireframe</label>
<button id="ml-switch" title="Switch to Mesh Decimation">Decimate</button>
</div>
</div>

<div id=\"ml-list\" style=\"background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.08); border-radius:8px; padding:6px; max-height:180px; overflow:auto\">
<div style=\"opacity:.7\">No models yet. Click Refresh.</div>
</div>

<div style=\"display:flex; gap:8px; margin-top:8px; flex-wrap:wrap\">
<button id=\"ml-refresh\">Refresh</button>
<button id=\"ml-load-selected\">Load Selected</button>
<button id=\"ml-clear\">Clear</button>
<button id=\"ml-frame\">Frame</button>
</div>

<hr style=\"border:none;border-top:1px solid rgba(255,255,255,.08); margin:10px 0\"/>

<div>Load from disk (.glb)</div>
<div style=\"display:flex; gap:8px; margin-top:6px; align-items:center\">
<input id=\"ml-files\" type=\"file\" accept=\".glb,model/gltf-binary\" multiple />
<button id=\"ml-load-files\">Load Files</button>
</div>

<div id=\"ml-msg\" style=\"margin-top:8px; opacity:.85\"></div>
    `;
    document.body.appendChild(panel);

    const $ = (sel) => panel.querySelector(sel);
    const listEl = $('#ml-list');
    const msgEl = $('#ml-msg');

    const state = {items: [], selected: new Set(), files: []};

    function renderList() {
        listEl.innerHTML = '';
        if (!state.items.length) {
            listEl.innerHTML = '<div style=\"opacity:.7\">No models found. Add /assets/models.json or put GLBs in /assets and create a manifest.</div>';
            return;
        }
        state.items.forEach((m, i) => {
            const row = document.createElement('label');
            row.style.cssText = 'display:flex; align-items:center; gap:6px; padding:4px 2px;';
            row.innerHTML = `
<input type=\"checkbox\" data-i=\"${i}\">
<code style=\"flex:1 1 auto\">${m.name}</code>
<span style=\"opacity:.7\">${m.path}</span>
    `;
            listEl.appendChild(row);
        });
        listEl.querySelectorAll('input[type=\"checkbox\"]').forEach(cb => {
            cb.addEventListener('change', () => {
                const idx = Number(cb.getAttribute('data-i'));
                if (cb.checked) state.selected.add(idx); else state.selected.delete(idx);
            });
        });
    }

    async function refresh() {
        try {
            msgEl.textContent = 'Loading catalog…';
            const arr = await fetchList?.();
            state.items = Array.isArray(arr) ? arr : [];
            state.selected.clear();
            renderList();
            msgEl.textContent = `Found ${state.items.length} model(s).`;
        } catch (e) {
            msgEl.textContent = 'Failed to load list: ' + (e?.message || e);
        }
    }

    $('#ml-refresh').addEventListener('click', refresh);

    $('#ml-load-selected').addEventListener('click', async () => {
        const urls = [...state.selected].map(i => state.items[i].path);
        if (!urls.length) {
            msgEl.textContent = 'Select one or more models first.';
            return;
        }
        msgEl.textContent = 'Loading selected…';
        try {
            await onLoadUrls?.(urls);
            msgEl.textContent = `Loaded ${urls.length} model(s).`;
        } catch (e) {
            msgEl.textContent = 'Load failed: ' + (e?.message || e);
        }
    });

    $('#ml-clear').addEventListener('click', async () => {
        try {
            await onClear?.();
            msgEl.textContent = 'Cleared.';
        } catch (e) {
            msgEl.textContent = 'Clear failed: ' + (e?.message || e);
        }
    });

    $('#ml-frame').addEventListener('click', async () => {
        try {
            await onFrame?.();
        } catch (e) {
            msgEl.textContent = 'Frame failed: ' + (e?.message || e);
        }
    });

    $('#ml-files').addEventListener('change', (e) => {
        state.files = [...(e.target?.files || [])];
        msgEl.textContent = `${state.files.length} file(s) selected.`;
    });

    $('#ml-load-files').addEventListener('click', async () => {
        if (!state.files.length) {
            msgEl.textContent = 'Pick .glb files first.';
            return;
        }
        msgEl.textContent = 'Loading files…';
        try {
            await onLoadFiles?.(state.files);
            msgEl.textContent = `Loaded ${state.files.length} file(s).`;
        } catch (e) {
            msgEl.textContent = 'Load failed: ' + (e?.message || e);
        }
    });

    $('#ml-wire').addEventListener('change', (e) => {
        try {
            onWireframe?.(!!e.target.checked);
        } catch {
        }
    });

    // Panel toggling
    $('#ml-switch').addEventListener('click', () => onSwitch?.('decimate'));

    // initial fetch
    refresh();

    // Visibility API for app.js
    function show() {
        panel.style.display = 'block';
    }

    function hide() {
        panel.style.display = 'none';
    }

    return {show, hide, refresh};
}

