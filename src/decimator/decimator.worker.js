import {WebIO} from '@gltf-transform/core';
import {simplify, weld} from '@gltf-transform/functions';
import {MeshoptSimplifier} from 'meshoptimizer';


self.onmessage = async (e) => {
    const {id, type, payload} = e.data || {};
    try {
        if (type === 'decimate') {
            const {buffer, ratio, error} = payload;
            const io = new WebIO();


            // BEFORE stats
            const beforeDoc = await io.readBinary(new Uint8Array(buffer));
            const before = countStats(beforeDoc);


            // Simplify
            await MeshoptSimplifier.ready;
            const doc = await io.readBinary(new Uint8Array(buffer));
            await doc.transform(
                weld({}),
                simplify({simplifier: MeshoptSimplifier, ratio, error})
            );
            const after = countStats(doc);


            const out = await io.writeBinary(doc);
            postMessage({id, ok: true, result: {glb: out.buffer, before, after}}, [out.buffer]);
            return;
        }
        throw new Error('unknown type');
    } catch (err) {
        postMessage({id, ok: false, error: (err?.message || String(err))});
    }
};


function countStats(doc) {
    let tris = 0, verts = 0;
    for (const mesh of doc.getRoot().listMeshes()) {
        for (const prim of mesh.listPrimitives()) {
            const indices = prim.getIndices();
            const mode = prim.getMode(); // 4 = TRIANGLES
            if (!indices) continue;
            const ic = indices.getCount();
            if (mode === 4) tris += Math.floor(ic / 3);
            else if (mode === 5) tris += Math.max(0, ic - 2);
            else if (mode === 6) tris += Math.max(0, ic - 2);
            const pos = prim.getAttribute('POSITION');
            if (pos) verts += pos.getCount();
        }
    }
    return {triangles: tris, vertices: verts};
}