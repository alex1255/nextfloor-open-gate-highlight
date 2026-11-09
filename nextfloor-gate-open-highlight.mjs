// NextFloor's public plugin API registers the module. The 3D adapter below
// attaches an indicator to the floor group so it follows the camera and floor.
const yellow = 0xffd43b;

export function isGateOpen(states, gate) {
  const contact = states?.[gate.contact]?.state;
  if (contact === 'on' || contact === 'off') return contact === 'on';
  return ['open', 'opening', 'closing'].includes(states?.[gate.entity]?.state);
}

export function framePositions(floor, fence, gate) {
  const start = fence.points[gate.edge];
  const end = fence.points[(gate.edge + 1) % fence.points.length];
  if (!start || !end) return [];
  const length = Math.hypot(end[0] - start[0], end[1] - start[1]);
  const width = Math.min(gate.width, length - 0.1);
  const height = fence.height ?? 1.2;
  if (width < 0.3 || height < 0.3) return [];
  const left = Math.max(0.05, Math.min(length - width - 0.05, gate.offset - width / 2));
  const dx = (end[0] - start[0]) / length;
  const dz = (end[1] - start[1]) / length;
  const base = (floor.elevation > 0.3 ? 0 : -0.2) + (fence.offset ?? 0);
  const stroke = 0.09;
  const vertices = [];
  const point = (x, y) => [start[0] + dx * (left + x), base + y, start[1] + dz * (left + x)];
  function bar(x0, y0, x1, y1) {
    const a = point(x0, y0);
    const b = point(x1, y0);
    const c = point(x1, y1);
    const d = point(x0, y1);
    vertices.push(...a, ...b, ...c, ...a, ...c, ...d);
  }
  bar(stroke, stroke, 2 * stroke, height);
  bar(width - 2 * stroke, stroke, width - stroke, height);
  bar(2 * stroke, height - stroke, width - 2 * stroke, height);
  bar(2 * stroke, stroke, width - 2 * stroke, 2 * stroke);
  return vertices;
}

function createFrame(viewer, floor, fence, gate) {
  const ground = viewer.ground;
  const position = ground?.geometry?.getAttribute('position');
  if (!position || !ground.material?.isMeshBasicMaterial || !floor.group?.add) return null;
  const vertices = framePositions(floor.floor, fence, gate);
  if (!vertices.length || !vertices.every(Number.isFinite)) return null;
  // The plane is a safe source for the viewer's Three.js constructors.
  const geometry = new ground.geometry.constructor(1, 1);
  geometry.setIndex(null);
  geometry.deleteAttribute('normal');
  geometry.deleteAttribute('uv');
  geometry.setAttribute('position', new position.constructor(new Float32Array(vertices), 3));
  const material = new ground.material.constructor({ color: yellow, side: 2, toneMapped: false });
  const mesh = new ground.constructor(geometry, material);
  floor.group.add(mesh);
  return mesh;
}

function findViews(root, views) {
  for (const element of root.querySelectorAll('*')) {
    if (element.localName === 'nf-view3d') views.add(element);
    if (element.shadowRoot) findViews(element.shadowRoot, views);
  }
}

function start() {
  let views = new Set();
  const frames = new Map();
  const framesByFloor = new WeakMap();
  function remove(gate, { mesh, viewer }) {
    mesh.removeFromParent();
    mesh.geometry.dispose();
    mesh.material.dispose();
    viewer.invalidate();
    frames.delete(gate);
  }
  function discover() {
    views = new Set();
    if (!document.hidden) findViews(document, views);
  }
  function refresh() {
    if (document.hidden) return;
    const active = new Set();
    for (const view of views) {
      const viewer = view.viewer;
      if (!view.isConnected || !Array.isArray(viewer?.floors) || typeof viewer.invalidate !== 'function') continue;
      for (const floor of viewer.floors) {
        if (floor.o < 0.85) continue;
        for (const fence of floor.floor?.outdoor ?? []) {
          for (const gate of fence.gates ?? []) {
            if (gate.kind !== 'sliding' || !isGateOpen(view.hass?.states, gate)) continue;
            // Floor views are rebuilt independently, including in multiple
            // viewers of the same plan on one page.
            const key = framesByFloor.get(floor)?.get(gate.id) ?? {};
            active.add(key);
            if (frames.has(key)) continue;
            const mesh = createFrame(viewer, floor, fence, gate);
            if (!mesh) continue;
            if (!framesByFloor.has(floor)) framesByFloor.set(floor, new Map());
            framesByFloor.get(floor).set(gate.id, key);
            frames.set(key, { mesh, viewer });
            viewer.invalidate();
          }
        }
      }
    }
    for (const [key, entry] of frames) if (!active.has(key)) remove(key, entry);
  }
  discover();
  refresh();
  const discovery = setInterval(discover, 1500);
  const updates = setInterval(refresh, 300);
  return () => {
    clearInterval(discovery);
    clearInterval(updates);
    for (const [floor, entry] of frames) remove(floor, entry);
  };
}

if (typeof window !== 'undefined') {
  const plugin = { id: 'gate-open-highlight', name: 'Open Gate Highlight', version: '1.0.0', apiVersion: 1 };
  if (window.NextFloor) window.NextFloor.register(plugin);
  else (window.__nextfloorPlugins ??= []).push(plugin);
  window.__nextfloorGateHighlight?.();
  window.__nextfloorGateHighlight = start();
}
