/* Caches public application assets only. Medical records remain in localStorage. */
const CACHE = 'orbit-assets-shared-design-v88-tibia-lac1';
const SHELL = [
  './', './index.html', './studio.css', './assistant-dock.css', './doctor-appearance.mjs', './doctor-materials.js', './assets/avatar/skin-microdetail.png', './style.css', './brand.css', './assets/brand/orbit-logo-sidebar.png', './assets/brand/orbit-mark-32.png', './assets/brand/orbit-mark-180.png', './crew.css', './anatomy-lab.css', './anatomy-workspace.css', './voice.css', './voice.js', './care.css', './theme-scale.css', './design-tokens.css', './theme.css', './mission.css', './touch.css', './trends.css',

  './neural-model.js', './neural-logic.js', './neural-adapter.js', './models/neural-health.json',
  './collect.css', './collect.js', './collection-methods.js', './collection-player.js',
  './app.js', './historical-crew.js', './crew.js', './anatomy-lab.js', './care.js', './care-logic.js',
  './doctor-headset.mjs', './doctor-body.mjs', './doctor-arm.mjs', './doctor-yawn.mjs', './doctor-watch.mjs', './doctor-avatar.js', './doctor-motion.mjs', './doctor-software3d.js', './vendor/GLTFLoader.js', './vendor/BufferGeometryUtils.js',
  './models/doctor/space-doctor-female.glb',
  './models/doctor/space-doctor.glb', './models/doctor/ATTRIBUTION.md', './models/doctor/VALID-LICENSE.txt',
  './condition-anatomy.js', './condition-reference.js', './condition-panel.js', './bone-report-index.js', './anatomy-conditions.mjs', './models/condition-reference.json', './assistant.js', './assistant-actions.js', './assistant-features.js', './assistant-permissions.js', './assistant-bridge.js', './assistant.css', './workspace.css', './workspace-layout.css', './workspace.js', './vendor/elevenlabs-client.js', './vendor/ELEVENLABS-NOTICES.txt',
  './health-inputs.js', './health-inputs.css', './input-logic.js', './observation-store.js', './state-logic.js', './access-logic.js', './pdf-logic.js', './mission-logic.js', './skin-logic.js', './research-library.js', './assets/ALL_NUMERIC_METRICS_LONG.csv', './hrp-reference.js', './hrp-links.js', './mission.js', './skin.js',    './onboard-assistant.js', './onboard-assistant.css',
  './anatomy-details.js', './anatomy3d.js', './left-tibia-laceration.mjs', './software3d.js', './anatomy-logic.mjs', './manifest.webmanifest',
  './vendor/three.module.min.js', './vendor/OrbitControls.js', './vendor/THREE-LICENSE.txt',
  './models/expanded-atlas.json', './models/anatomy-studies.json', './models/ANATOMY_SOURCES.md', './models/Z-ANATOMY-LICENSE.txt', './models/Z-ANATOMY-CREDITS.md', './models/atlas.json', './models/catalog.json', './models/bones-206.csv', './models/ATTRIBUTION.txt',
  './assets/earth-orbit.jpg', './assets/orbit.svg', './assets/fonts.css',
  './assets/-F63fjptAgt5VM-kVkqdyU8n5ig.woff2',
  './assets/-F6qfjptAgt5VM-kVkqdyU8n3twJ8lc.woff2',
  './assets/-F6qfjptAgt5VM-kVkqdyU8n3vAO8lc.woff2',
  './assets/ijwGs572Xtc6ZYQws9YVwllKVG8qX1oyOymuFpm5ww.woff2',
  './assets/ijwGs572Xtc6ZYQws9YVwllKVG8qX1oyOymuJJm5ww.woff2',
  './assets/ijwGs572Xtc6ZYQws9YVwllKVG8qX1oyOymuyJ65ww.woff2',
  './assets/ijwGs572Xtc6ZYQws9YVwllKVG8qX1oyOymu8Z65ww.woff2',
  './assets/ijwGs572Xtc6ZYQws9YVwllKVG8qX1oyOymulp65ww.woff2'
];
const ANATOMY = Array.from({length:15}, (_,i) => `./models/body-${i}.bin`);
const EXPANDED = Array.from({length:12}, (_,i) => `./models/expanded-${i}.bin`);
const ALL = [...SHELL, ...ANATOMY, ...EXPANDED];
const GEOMETRY_INDEXES = ['./models/atlas.json', './models/expanded-atlas.json'];
/* Chunks are only valid for the atlas that indexes them, so they carry over only when both indexes are unchanged. */
async function carryGeometry(previousKeys) {
  const cache = await caches.open(CACHE);
  const href = path => new URL(path, self.location.href).href;
  const indexText = async (source, path) => { const hit = await source.match(href(path)); return hit ? hit.text() : null; };
  for (const key of previousKeys) {
    const previous = await caches.open(key);
    const same = await Promise.all(GEOMETRY_INDEXES.map(async path => {
      const before = await indexText(previous, path);
      return before !== null && before === await indexText(cache, path);
    }));
    if (!same.every(Boolean)) continue;
    for (const path of [...ANATOMY, ...EXPANDED]) {
      if (await cache.match(href(path))) continue;
      const hit = await previous.match(href(path));
      if (hit) await cache.put(href(path), hit);
    }
  }
}
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(async keys => {
    const previous = keys.filter(key => key.startsWith('orbit-assets-') && key !== CACHE);
    await carryGeometry(previous).catch(() => {});
    await Promise.all(previous.map(key => caches.delete(key)));
  }).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(new URL('./', self.location.href).pathname)) return;
  if (!ALL.some(path => new URL(path, self.location.href).pathname === url.pathname)) return;
  event.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(event.request, {ignoreSearch:true});
    if (cached) return cached;
    const response = await fetch(event.request);
    if (response.ok && response.type === 'basic') await cache.put(event.request, response.clone()).catch(() => {});
    return response;
  }));
});
self.addEventListener('message', event => {
  const port = event.ports[0];
  if (!port) return;
  if (event.data?.type === 'OFFLINE_STATUS') {
    event.waitUntil(caches.open(CACHE).then(async cache => {
      const results = await Promise.all(ALL.map(path => cache.match(new URL(path,self.location.href).href)));
      port.postMessage({type:'status',ready:results.every(Boolean)});
    }));
  }
  if (event.data?.type === 'PREPARE_OFFLINE') {
    event.waitUntil((async () => {
      try {
        const cache = await caches.open(CACHE);
        let done = 0;
        for (const path of ALL) {
          const url = new URL(path,self.location.href).href;
          if (!await cache.match(url)) await cache.add(url);
          port.postMessage({type:'progress',done:++done,total:ALL.length});
        }
        port.postMessage({type:'complete'});
      } catch { port.postMessage({type:'error'}); }
    })());
  }
});
