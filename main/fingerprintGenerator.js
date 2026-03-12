'use strict'
const path = require('path')
const fs   = require('fs')

// ─── User-Agent pools (Chrome 120-133, realistic distribution) ───────────────

const WIN_UAS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
]

const MAC_UAS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_7_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
]

// ─── WebGL pools — MUST match OS (no Apple GPU on Windows, no ANGLE on Mac) ──

const WIN_WEBGL = [
  { vendor: 'Google Inc. (Intel)',  renderer: 'ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)' },
  { vendor: 'Google Inc. (Intel)',  renderer: 'ANGLE (Intel, Intel(R) UHD Graphics 630 Direct3D11 vs_5_0 ps_5_0, D3D11)' },
  { vendor: 'Google Inc. (Intel)',  renderer: 'ANGLE (Intel, Intel(R) Iris(R) Xe Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)' },
  { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1650 Direct3D11 vs_5_0 ps_5_0, D3D11)' },
  { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)' },
  { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1660 Ti Direct3D11 vs_5_0 ps_5_0, D3D11)' },
  { vendor: 'Google Inc. (AMD)',    renderer: 'ANGLE (AMD, Radeon RX 580 Direct3D11 vs_5_0 ps_5_0, D3D11)' },
]

const MAC_WEBGL = [
  { vendor: 'Apple',                renderer: 'Apple M1' },
  { vendor: 'Apple',                renderer: 'Apple M2' },
  { vendor: 'Apple',                renderer: 'Apple M1 Pro' },
  { vendor: 'Google Inc. (Apple)',  renderer: 'ANGLE (Apple, ANGLE Metal Renderer: Apple M1, Unspecified Version)' },
  { vendor: 'Google Inc. (Apple)',  renderer: 'ANGLE (Apple, ANGLE Metal Renderer: Apple M2, Unspecified Version)' },
]

// ─── OS profiles (WebGL pool now matched per OS) ─────────────────────────────

const OS_PROFILES = [
  { platform: 'Win32',    ua_pool: WIN_UAS, webgl_pool: WIN_WEBGL },
  { platform: 'MacIntel', ua_pool: MAC_UAS, webgl_pool: MAC_WEBGL },
]

const RESOLUTIONS = [
  [1920, 1080], [1920, 1080], [1920, 1080], // weighted — most common
  [1366, 768],  [1440, 900],  [1536, 864],
  [1280, 720],  [1600, 900],  [2560, 1440],
]

const HW_CONCURRENCY = [4, 4, 4, 8, 8, 8, 8, 12, 16]  // weighted toward 4/8
const DEVICE_MEMORY  = [4, 4, 8, 8, 8]

// ─── Country → timezone & language maps ──────────────────────────────────────

const COUNTRY_TIMEZONE = {
  US: 'America/New_York', CA: 'America/Toronto',  GB: 'Europe/London',
  DE: 'Europe/Berlin',    FR: 'Europe/Paris',      NL: 'Europe/Amsterdam',
  RU: 'Europe/Moscow',    UA: 'Europe/Kiev',       PL: 'Europe/Warsaw',
  JP: 'Asia/Tokyo',       KR: 'Asia/Seoul',        CN: 'Asia/Shanghai',
  TW: 'Asia/Taipei',      SG: 'Asia/Singapore',    TH: 'Asia/Bangkok',
  VN: 'Asia/Ho_Chi_Minh', ID: 'Asia/Jakarta',      IN: 'Asia/Kolkata',
  AU: 'Australia/Sydney', BR: 'America/Sao_Paulo', MX: 'America/Mexico_City',
  IT: 'Europe/Rome',      ES: 'Europe/Madrid',     SE: 'Europe/Stockholm',
  TR: 'Europe/Istanbul',  AE: 'Asia/Dubai',        HK: 'Asia/Hong_Kong',
}

const COUNTRY_LANGUAGE = {
  US: 'en-US', CA: 'en-US', GB: 'en-GB', AU: 'en-AU', SG: 'en-SG', IN: 'en-IN',
  DE: 'de-DE', AT: 'de-DE', CH: 'de-DE',
  FR: 'fr-FR', BE: 'fr-FR',
  JP: 'ja-JP', KR: 'ko-KR', CN: 'zh-CN', TW: 'zh-TW', HK: 'zh-HK',
  RU: 'ru-RU', UA: 'uk-UA', PL: 'pl-PL', TR: 'tr-TR',
  BR: 'pt-BR', PT: 'pt-PT', ES: 'es-ES', MX: 'es-MX', IT: 'it-IT',
  NL: 'nl-NL', SE: 'sv-SE', TH: 'th-TH', VN: 'vi-VN', ID: 'id-ID',
  AE: 'ar-AE', VN: 'vi-VN',
}

const FALLBACK_TIMEZONES = [
  'America/New_York', 'America/Chicago', 'America/Los_Angeles',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin',
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }

// ─── Generator ────────────────────────────────────────────────────────────────

/**
 * @param {object} geo - optional { timezone, country } from IP geolocation
 */
function generateFingerprint(geo = {}) {
  const os    = pick(OS_PROFILES)
  const webgl = pick(os.webgl_pool)
  const res   = pick(RESOLUTIONS)

  // Timezone: from geo > fallback pool
  const timezone = (geo.timezone && geo.timezone.includes('/'))
    ? geo.timezone
    : pick(FALLBACK_TIMEZONES)

  // Language: from geo country map > en-US default
  const language = (geo.country && COUNTRY_LANGUAGE[geo.country])
    ? COUNTRY_LANGUAGE[geo.country]
    : 'en-US'

  const langs = language === 'en-US'
    ? ['en-US', 'en']
    : [language, 'en-US', 'en']

  return {
    fp_user_agent:           pick(os.ua_pool),
    fp_platform:             os.platform,
    fp_hardware_concurrency: pick(HW_CONCURRENCY),
    fp_device_memory:        pick(DEVICE_MEMORY),
    fp_language:             language,
    fp_languages:            JSON.stringify(langs),
    fp_screen_width:         res[0],
    fp_screen_height:        res[1],
    fp_canvas_noise:         String((Math.random() * 0.4 + 0.1).toFixed(6)),
    fp_webgl_vendor:         webgl.vendor,
    fp_webgl_renderer:       webgl.renderer,
    fp_timezone:             timezone,
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

  const langs        = JSON.parse(fp.fp_languages)
  const chromeVer    = (fp.fp_user_agent.match(/Chrome\/(\d+)/) || [])[1] || '133'
  const osPlatform   = fp.fp_platform === 'Win32' ? 'Windows' : 'macOS'
  const osVersion    = fp.fp_platform === 'Win32' ? '10.0.0' : '14.0.0'

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
      timezone:            fp.fp_timezone,
      chromeVersion:       chromeVer,
      uaPlatform:          osPlatform,
      uaPlatformVersion:   osVersion,
    }),
    'utf8'
  )

  return extDir
}

function buildInjectScript(v) {
  return `(function(){
  'use strict';
  const NOISE = ${v.canvasNoise};

  // ── navigator basic ────────────────────────────────────────────────────────
  function defNav(prop, val) {
    try { Object.defineProperty(navigator, prop, { get: () => val, configurable: true }); } catch(e){}
  }
  defNav('userAgent',           ${JSON.stringify(v.userAgent)});
  defNav('platform',            ${JSON.stringify(v.platform)});
  defNav('hardwareConcurrency', ${v.hardwareConcurrency});
  defNav('deviceMemory',        ${v.deviceMemory});
  defNav('language',            ${JSON.stringify(v.language)});
  defNav('languages',           Object.freeze(${JSON.stringify(v.languages)}));
  defNav('maxTouchPoints',      0);
  defNav('vendor',              'Google Inc.');
  defNav('webdriver',           false);

  // ── navigator.userAgentData (UA Client Hints — must match UA string) ───────
  try {
    const _ver = ${JSON.stringify(v.chromeVersion)};
    const _brands = [
      { brand: 'Chromium',      version: _ver },
      { brand: 'Google Chrome', version: _ver },
      { brand: 'Not-A.Brand',   version: '99' },
    ];
    const _uaData = {
      brands:   _brands,
      mobile:   false,
      platform: ${JSON.stringify(v.uaPlatform)},
      getHighEntropyValues: async (hints) => {
        const r = {};
        if (hints.includes('architecture'))    r.architecture    = 'x86';
        if (hints.includes('bitness'))         r.bitness         = '64';
        if (hints.includes('brands'))          r.brands          = _brands;
        if (hints.includes('fullVersionList')) r.fullVersionList = _brands.map(b => ({ brand: b.brand, version: b.version + '.0.0.0' }));
        if (hints.includes('mobile'))          r.mobile          = false;
        if (hints.includes('model'))           r.model           = '';
        if (hints.includes('platform'))        r.platform        = ${JSON.stringify(v.uaPlatform)};
        if (hints.includes('platformVersion')) r.platformVersion = ${JSON.stringify(v.uaPlatformVersion)};
        if (hints.includes('uaFullVersion'))   r.uaFullVersion   = _ver + '.0.0.0';
        return r;
      },
      toJSON: () => ({ brands: _brands, mobile: false, platform: ${JSON.stringify(v.uaPlatform)} }),
    };
    defNav('userAgentData', _uaData);
  } catch(e){}

  // ── NetworkInformation ─────────────────────────────────────────────────────
  try {
    const conn = { effectiveType: '4g', type: 'wifi', downlink: 10, rtt: 50, saveData: false };
    Object.defineProperty(navigator, 'connection',       { get: () => conn, configurable: true });
    Object.defineProperty(navigator, 'mozConnection',    { get: () => undefined, configurable: true });
    Object.defineProperty(navigator, 'webkitConnection', { get: () => undefined, configurable: true });
  } catch(e){}

  // ── screen ─────────────────────────────────────────────────────────────────
  function defScreen(prop, val) {
    try { Object.defineProperty(screen, prop, { get: () => val, configurable: true }); } catch(e){}
  }
  defScreen('width',       ${v.screenWidth});
  defScreen('height',      ${v.screenHeight});
  defScreen('availWidth',  ${v.screenWidth});
  defScreen('availHeight', ${v.screenHeight - 40});
  defScreen('colorDepth',  24);
  defScreen('pixelDepth',  24);

  // ── window geometry ────────────────────────────────────────────────────────
  try { Object.defineProperty(window, 'outerWidth',       { get: () => ${v.screenWidth},  configurable: true }); } catch(e){}
  try { Object.defineProperty(window, 'outerHeight',      { get: () => ${v.screenHeight}, configurable: true }); } catch(e){}
  try { Object.defineProperty(window, 'devicePixelRatio', { get: () => 1,                 configurable: true }); } catch(e){}

  // ── window.chrome (must exist in real Chrome, Electron may omit it) ────────
  try {
    if (!window.chrome || !window.chrome.runtime) {
      window.chrome = {
        app: { isInstalled: false },
        runtime: { id: undefined },
        loadTimes: function() { return {}; },
        csi: function() { return {}; },
      };
    }
  } catch(e){}

  // ── Timezone consistency (belt-and-suspenders over TZ env var) ────────────
  try {
    const _TZ = ${JSON.stringify(v.timezone)};
    const _OrigDTF = Intl.DateTimeFormat;
    function PatchedDTF(locale, opts) {
      opts = opts || {};
      if (!opts.timeZone) opts = Object.assign({}, opts, { timeZone: _TZ });
      return new _OrigDTF(locale, opts);
    }
    PatchedDTF.prototype        = _OrigDTF.prototype;
    PatchedDTF.supportedLocalesOf = _OrigDTF.supportedLocalesOf.bind(_OrigDTF);
    Intl.DateTimeFormat = PatchedDTF;
  } catch(e){}

  // ── Canvas noise ───────────────────────────────────────────────────────────
  const _origToDataURL = HTMLCanvasElement.prototype.toDataURL;
  const _origToBlob    = HTMLCanvasElement.prototype.toBlob;

  function applyCanvasNoise(canvas) {
    try {
      const ctx = canvas.getContext('2d');
      if (!ctx || !canvas.width || !canvas.height) return;
      const w = Math.min(canvas.width, 32), h = Math.min(canvas.height, 32);
      const img = CanvasRenderingContext2D.prototype.getImageData.call(ctx, 0, 0, w, h);
      for (let i = 0; i < img.data.length; i += 4) {
        img.data[i]   = Math.min(255, Math.max(0, img.data[i]   + Math.round(NOISE * (Math.random() > 0.5 ? 1 : -1))));
        img.data[i+1] = Math.min(255, Math.max(0, img.data[i+1] + Math.round(NOISE * (Math.random() > 0.5 ? 1 : -1))));
      }
      ctx.putImageData(img, 0, 0);
    } catch(e){}
  }

  HTMLCanvasElement.prototype.toDataURL = function(...a)     { applyCanvasNoise(this); return _origToDataURL.apply(this, a); };
  HTMLCanvasElement.prototype.toBlob    = function(cb, ...a) { applyCanvasNoise(this); return _origToBlob.call(this, cb, ...a); };

  // ── Font fingerprint — spoof measureText metrics ───────────────────────────
  try {
    const _origMeasure = CanvasRenderingContext2D.prototype.measureText;
    const _fontNoise   = NOISE * 0.000012; // sub-pixel, imperceptible
    CanvasRenderingContext2D.prototype.measureText = function(text) {
      const m = _origMeasure.call(this, text);
      return new Proxy(m, {
        get(t, prop) {
          const val = t[prop];
          if (typeof val === 'number') return val + _fontNoise;
          return typeof val === 'function' ? val.bind(t) : val;
        }
      });
    };
  } catch(e){}

  // ── Audio fingerprint — patch AudioBuffer.getChannelData (the real read point)
  try {
    const _origGetChannelData = AudioBuffer.prototype.getChannelData;
    const _audioNoise = NOISE * 1e-7; // inaudible, but changes the hash
    AudioBuffer.prototype.getChannelData = function(channel) {
      const data = _origGetChannelData.call(this, channel);
      for (let i = 0; i < data.length; i += 8) {
        data[i] += _audioNoise * (Math.random() > 0.5 ? 1 : -1);
      }
      return data;
    };
  } catch(e){}

  // ── WebRTC — block entirely to prevent real IP leak ───────────────────────
  // Chrome flag alone is insufficient when proxy is HTTP (not SOCKS5)
  try {
    const _noRTC = () => { throw new DOMException('WebRTC disabled', 'NotSupportedError'); };
    ['RTCPeerConnection','RTCDataChannel','RTCSessionDescription',
     'RTCIceCandidate','webkitRTCPeerConnection','mozRTCPeerConnection'].forEach(k => {
      try { Object.defineProperty(window, k, { value: undefined, configurable: true, writable: true }); } catch(e){}
    });
  } catch(e){}

  // ── WebGL ──────────────────────────────────────────────────────────────────
  const VENDOR   = ${JSON.stringify(v.webglVendor)};
  const RENDERER = ${JSON.stringify(v.webglRenderer)};

  ['webgl', 'webgl2', 'experimental-webgl'].forEach(type => {
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
    } catch(e){}
  });

})();
`
}

module.exports = { generateFingerprint, buildExtension }
