export function attachDecimatePanel({getSource, onPreview, onDownload, onWireframe}) {
    const panel = document.createElement('div');
    panel.style.cssText = `position:fixed; left:12px; top:52px; z-index:9999; padding:10px; width:300px; border-radius:10px; background:rgba(12,14,22,.9); color:#e8eefc; font:13px system-ui; border:1px solid rgba(255,255,255,.08)`;
    panel.innerHTML = `
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
<strong>Mesh Decimation</strong>
<span style="opacity:.7">src: <code id="src-name"></code></span>
</div>
<label>Ratio (keep%)
<input id="dec-ratio" type="range" min="0.05" max="1" step="0.05" value="0.3">
<span id="dec-ratio-val">30%</span>
</label><br/>
<label>Error (0–0.2)
<input id="dec-error" type="range" min="0" max="0.2" step="0.001" value="0.050">
<span id="dec-error-val">0.05</span>
</label><br/>
<label><input id="dec-wire" type="checkbox" checked> Wireframe preview</label>
<div id="dec-stats" style="margin-top:6px; opacity:.85">before: — tris • after: — tris</div>
<div style="display:flex; gap:8px; margin-top:8px">
<button id="dec-preview">Preview</button>
<button id="dec-download">Download</button>
</div>
<div id="dec-msg" style="margin-top:6px; opacity:.85"></div>
`;
    document.body.appendChild(panel);


    const $ = (id) => panel.querySelector(id);
    const srcEl = $('#src-name');
    const ratio = $('#dec-ratio');
    const ratioVal = $('#dec-ratio-val');
    const error = $('#dec-error');
    const errorVal = $('#dec-error-val');
    const wire = $('#dec-wire');
    const msg = $('#dec-msg');
    const stats = $('#dec-stats');


    const refresh = () => {
        srcEl.textContent = getSource?.() || '—';
        ratioVal.textContent = `${Math.round(Number(ratio.value) * 100)}%`;
        errorVal.textContent = `${Number(error.value)}`;
    };
    const showStats = (before, after) => {
        if (!before || !after) return;
        stats.textContent = `before: ${before.triangles.toLocaleString()} tris • after: ${after.triangles.toLocaleString()} tris`;
    };
    refresh();


    // Debounced auto-apply on slider change
    let applying = false, queued = false, t = 0;
    const applyNow = async () => {
        if (!onPreview) return;
        if (applying) {
            queued = true;
            return;
        }
        applying = true;
        msg.textContent = 'Simplifying…';
        try {
            const res = await onPreview({
                ratio: Number(ratio.value),
                error: Number(error.value),
                wireframe: wire.checked,
            });
            if (res?.before && res?.after) showStats(res.before, res.after);
            msg.textContent = 'Preview updated.';
        } catch (e) {
            msg.textContent = 'Failed: ' + e.message;
        } finally {
            applying = false;
            if (queued) {
                queued = false;
                applyNow();
            }
        }
    };
    const debouncedApply = () => {
        clearTimeout(t);
        t = setTimeout(applyNow, 350);
    };


    ratio.addEventListener('input', () => {
        refresh();
        debouncedApply();
    });
    error.addEventListener('input', () => {
        refresh();
        debouncedApply();
    });
    wire.addEventListener('change', () => {
        try {
            onWireframe?.(wire.checked);
        } catch {
        }
    });


    $('#dec-preview').addEventListener('click', async () => {
        try {
            msg.textContent = 'Simplifying (preview)…';
            const res = await onPreview?.({
                ratio: Number(ratio.value),
                error: Number(error.value),
                wireframe: wire.checked
            });
            if (res?.before && res?.after) showStats(res.before, res.after);
            msg.textContent = 'Preview updated.';
        } catch (e) {
            msg.textContent = 'Failed: ' + e.message;
        }
    });


    $('#dec-download').addEventListener('click', async () => {
        try {
            msg.textContent = 'Simplifying (download)…';
            const res = await onDownload?.({ratio: Number(ratio.value), error: Number(error.value)});
            if (res?.before && res?.after) showStats(res.before, res.after);
            msg.textContent = 'Downloaded simplified GLB.';
        } catch (e) {
            msg.textContent = 'Failed: ' + e.message;
        }
    });
}