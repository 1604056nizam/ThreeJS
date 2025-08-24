export class MetricsLogger {
    constructor(targetHz = 72) {
        this.targetMs = 1000 / targetHz;
        this.buf = [];
        this.max = 600;
        this.drops = 0;
        this.frames = 0;
        this.last = undefined;
        this.hud = document.createElement('div');
        Object.assign(this.hud.style, {
            position: 'fixed', left: '12px', bottom: '12px', padding: '6px 8px',
            background: 'rgba(0,0,0,.45)', color: '#e8eefc', font: '12px system-ui',
            borderRadius: '8px', zIndex: 9999
        });
        this.hud.textContent = 'metrics…';
        document.body.appendChild(this.hud);
        this.visible = true;
        this._provider = null;
        window.addEventListener('keydown', e => {
            if (e.key.toLowerCase() === 'l') this.toggleUI();
            //eif (e.key.toLowerCase() === 'e') this.exportCSV();
        });
    }

    tick(timeMs) {
        if (this.last !== undefined) {
            const dt = timeMs - this.last; // ms
            this.buf.push(dt);
            if (this.buf.length > this.max) this.buf.shift();
            if (dt > this.targetMs * 1.5) this.drops++;
            this.frames++;
            if ((this.frames % 30) === 0) this.updateHUD();
        }
        this.last = timeMs;
    }

    stats() {
        const arr = this.buf.slice().sort((a, b) => a - b);
        const avg = arr.reduce((s, v) => s + v, 0) / (arr.length || 1);
        const p99 = arr[Math.max(0, Math.floor(arr.length * 0.99) - 1)] || avg;
        return {avgFps: 1000 / avg, onePercentLowFps: 1000 / p99, drops: this.drops, samples: arr.length};
    }

    setExternalStatsProvider(fn) {
        this._provider = fn;
    }

    updateHUD() {
        const s = this.stats();
        let extra = '';

        if(this._provider) {
            try {
                const info = this._provider();
                extra = ` | tris ${info?.triangles ?? 0}`;
            } catch (e) {
                console.error(e);
                throw e
            }
        }

        this.hud.textContent = `FPS ${s.avgFps.toFixed(1)} | 1% ${s.onePercentLowFps.toFixed(1)} | drops ${s.drops}${extra}`;
    }

    toggleUI() {
        this.visible = !this.visible;
        this.hud.style.display = this.visible ? 'block' : 'none';
    }

    exportCSV() {
        const rows = ['# FPS metrics (aggregated)', `avg_fps,${this.stats().avgFps.toFixed(3)}`, `one_percent_low_fps,${this.stats().onePercentLowFps.toFixed(3)}`, `drops,${this.drops}`];
        const blob = new Blob([rows.join('\n')], {type: 'text/csv'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'metrics.csv';
        a.click();
    }
}
