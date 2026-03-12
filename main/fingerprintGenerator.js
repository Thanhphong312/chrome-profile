'use strict'
const path = require('path')
const fs   = require('fs')

// ─── Data pools ───────────────────────────────────────────────────────────────

const WIN_UAS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
]
const MAC_UAS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
]

const OS_PROFILES = [
  { platform: 'Win32',        ua_pool: WIN_UAS, langs: ['en-US', 'en-GB', 'de-DE', 'fr-FR', 'es-ES', 'pt-BR'] },
  { platform: 'MacIntel',     ua_pool: MAC_UAS, langs: ['en-US', 'en-GB', 'ja-JP', 'zh-CN', 'ko-KR', 'fr-FR'] },
]

const RESOLUTIONS = [
  [1920, 1080], [1366, 768], [1440, 900], [1536, 864],
  [1280, 720],  [1600, 900], [2560, 1440],[1280, 800],
]

const HW_CONCURRENCY = [2, 4, 4, 6, 8, 8, 12, 16]  // weighted toward 4/8
const DEVICE_MEMORY  = [4, 4, 8, 8, 8]              // weighted toward 8

const WEBGL_PROFILES = [
  { vendor: 'Google Inc. (Intel)',  renderer: 'ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)' },
  { vendor: 'Google Inc. (Intel)',  renderer: 'ANGLE (Intel, Intel(R) Iris(R) Xe Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)' },
  { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1650 Direct3D11 vs_5_0 ps_5_0, D3D11)' },
  { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)' },
  { vendor: 'Apple',                renderer: 'Apple M1' },
  { vendor: 'Apple',                renderer: 'Apple M2' },
]

const TIMEZONES = [
  'America/New_York', 'America/Chicago', 'America/Los_Angeles', 'America/Toronto',
  'America/Sao_Paulo','Europe/London',   'Europe/Paris',        'Europe/Berlin',
  'Europe/Moscow',    'Asia/Tokyo',      'Asia/Seoul',          'Asia/Shanghai',
  'Asia/Singapore',   'Asia/Bangkok',    'Asia/Dubai',          'Australia/Sydney',
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }

// ─── Generator ────────────────────────────────────────────────────────────────

function generateFingerprint() {
  const os   = pick(OS_PROFILES)
  const lang = pick(os.langs)
  const webgl = pick(WEBGL_PROFILES)
  const res   = pick(RESOLUTIONS)

  return {
    fp_user_agent:           pick(os.ua_pool),
    fp_platform:             os.platform,
    fp_hardware_concurrency: pick(HW_CONCURRENCY),
    fp_device_memory:        pick(DEVICE_MEMORY),
    fp_language:             lang,
    fp_languages:            JSON.stringify(lang === 'en-US' ? ['en-US'] : [lang, 'en-US']),
    fp_screen_width:         res[0],
    fp_screen_height:        res[1],
    fp_canvas_noise:         String((Math.random() * 0.35 + 0.05).toFixed(6)),
    fp_webgl_vendor:         webgl.vendor,
    fp_webgl_renderer:       webgl.renderer,
    fp_timezone:             pick(TIMEZONES),
  }
}

// ─── Extension builder ────────────────────────────────────────────────────────

function buildExtension(profilePath, fp) {
  const extDir = path.join(profilePath, 'fp-ext')
  fs.mkdirSync(extDir, { recursive: true })

  fs.writeFileSync(
    path.join(extDir, 'manifest.json'),
    JSON.stringify({
      manifest_version: 3,
      name: 'FP',
      version: '1.0',
      content_scripts: [{
        matches:    ['<all_urls>'],
        js:         ['inject.js'],
        run_at:     'document_start',
        world:      'MAIN',
        all_frames: true,
      }],
    }, null, 2),
    'utf8'
  )

  const langs = JSON.parse(fp.fp_languages)
  fs.writeFileSync(
    path.join(extDir, 'inject.js'),
    buildInjectScript({
      userAgent:           fp.fp_user_agent,
      platform:            fp.fp_platform,
      hardwareConcurrency: fp.fp_hardware_concurrency,
      deviceMemory:        fp.fp_device_memory,
      language:            fp.fp_language,
      languages:           langs,
      screenWidth:         fp.fp_screen_width,
      screenHeight:        fp.fp_screen_height,
      canvasNoise:         parseFloat(fp.fp_canvas_noise),
      webglVendor:         fp.fp_webgl_vendor,
      webglRenderer:       fp.fp_webgl_renderer,
    }),
    'utf8'
  )

  return extDir
}

function buildInjectScript(v) {
  return `(function(){
  'use strict';

  // ── navigator ──────────────────────────────────────────────────────────────
  function defNav(prop, val) {
    try { Object.defineProperty(navigator, prop, { get: () => val, configurable: true }); } catch(e){}
  }
  defNav('userAgent',           ${JSON.stringify(v.userAgent)});
  defNav('platform',            ${JSON.stringify(v.platform)});
  defNav('hardwareConcurrency', ${v.hardwareConcurrency});
  defNav('deviceMemory',        ${v.deviceMemory});
  defNav('language',            ${JSON.stringify(v.language)});
  defNav('languages',           Object.freeze(${JSON.stringify(v.languages)}));

  // ── screen ─────────────────────────────────────────────────────────────────
  function defScreen(prop, val) {
    try { Object.defineProperty(screen, prop, { get: () => val, configurable: true }); } catch(e){}
  }
  defScreen('width',       ${v.screenWidth});
  defScreen('height',      ${v.screenHeight});
  defScreen('availWidth',  ${v.screenWidth});
  defScreen('availHeight', ${v.screenHeight - 40});

  // ── canvas noise ───────────────────────────────────────────────────────────
  const NOISE = ${v.canvasNoise};
  const _origToDataURL = HTMLCanvasElement.prototype.toDataURL;
  const _origToBlob    = HTMLCanvasElement.prototype.toBlob;

  function applyNoise(canvas) {
    try {
      const ctx = canvas.getContext('2d');
      if (!ctx || !canvas.width || !canvas.height) return;
      // Perturb only first 32x32 area — enough to change hash, invisible to users
      const w = Math.min(canvas.width, 32), h = Math.min(canvas.height, 32);
      const img = CanvasRenderingContext2D.prototype.getImageData.call(ctx, 0, 0, w, h);
      for (let i = 0; i < img.data.length; i += 4) {
        img.data[i]   = Math.min(255, img.data[i]   + Math.round(NOISE * (Math.random() > 0.5 ? 1 : -1)));
        img.data[i+1] = Math.min(255, img.data[i+1] + Math.round(NOISE * (Math.random() > 0.5 ? 1 : -1)));
      }
      ctx.putImageData(img, 0, 0);
    } catch(e) {}
  }

  HTMLCanvasElement.prototype.toDataURL = function(...a) { applyNoise(this); return _origToDataURL.apply(this, a); };
  HTMLCanvasElement.prototype.toBlob    = function(cb, ...a) { applyNoise(this); return _origToBlob.call(this, cb, ...a); };

  // ── WebGL ──────────────────────────────────────────────────────────────────
  const VENDOR   = ${JSON.stringify(v.webglVendor)};
  const RENDERER = ${JSON.stringify(v.webglRenderer)};

  ['webgl','webgl2','experimental-webgl'].forEach(type => {
    try {
      const probe = document.createElement('canvas').getContext(type);
      if (!probe) return;
      const proto = Object.getPrototypeOf(probe);
      const orig  = proto.getParameter;
      proto.getParameter = function(p) {
        if (p === 0x9245) return VENDOR;
        if (p === 0x9246) return RENDERER;
        return orig.call(this, p);
      };
    } catch(e) {}
  });

})();
`
}

module.exports = { generateFingerprint, buildExtension }
