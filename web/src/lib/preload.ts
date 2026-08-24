/* One place that owns the heavy scene chunks.
   The loading screen waits on exactly the same promises React will later
   suspend on, and starting them here means the three.js bundle downloads
   while the fonts do rather than after. Dynamic imports are cached, so
   calling these again from lazy() costs nothing. */

export const importProvingBench = () => import("@/components/three/ProvingBench");
export const importFloatingIslands = () => import("@/components/three/FloatingIslands");

/** Resolves once every scene module is downloaded and parsed. Never rejects:
    a chunk that fails to load must not strand the visitor on the loader. */
export function preloadScenes(): Promise<void> {
  return Promise.all([
    importProvingBench().catch(() => null),
    importFloatingIslands().catch(() => null),
  ]).then(() => undefined);
}

export function webglAvailable(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}
