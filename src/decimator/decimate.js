export class Decimator {
    constructor() {
        this.worker = new Worker(new URL('./decimator.worker.js', import.meta.url), {type: 'module'});
    }


    async decimateURL({url, ratio = 0.5, error = 0.001}) {
        const res = await fetch(url);
        const buf = await res.arrayBuffer();
        return this.decimateBuffer({buffer: buf, ratio, error});
    }


    async decimateBuffer({buffer, ratio = 0.5, error = 0.001}) {
        const result = await this._rpc('decimate', {buffer, ratio, error});
        return result; // { glb:ArrayBuffer, before:{triangles,vertices}, after:{triangles,vertices} }
    }


    static downloadGLB(arrayBuffer, filename = 'simplified.glb') {
        const blob = new Blob([arrayBuffer], {type: 'model/gltf-binary'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }


    _rpc(type, payload) {
        return new Promise((resolve, reject) => {
            const id = Math.random().toString(36).slice(2);
            const onMsg = (e) => {
                if (e.data?.id !== id) return;
                this.worker.removeEventListener('message', onMsg);
                if (e.data?.ok) resolve(e.data.result);
                else reject(new Error(e.data?.error || 'Worker error'));
            };
            this.worker.addEventListener('message', onMsg);
            const xfer = payload.buffer ? [payload.buffer] : [];
            this.worker.postMessage({id, type, payload}, xfer);
        });
    }
}