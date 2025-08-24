export async function listModels() {
    try {
        const res = await fetch('/assets/models.json', {cache: 'no-store'});
        if (res.ok) {
            const data = await res.json();
            const arr = Array.isArray(data?.models) ? data.models : [];
            return arr.filter(m => typeof m?.path === 'string').map(m => ({
                name: m.name || m.path.split('/').pop(),
                path: m.path
            }));
        }
    } catch (_) {
    }


    try {
        const r = await fetch('/assets/DamagedHelmet.glb', {method: 'HEAD'});
        if (r.ok) return [{name: 'DamagedHelmet.glb', path: '/assets/DamagedHelmet.glb'}];
    } catch (_) {
    }
    return [];
}