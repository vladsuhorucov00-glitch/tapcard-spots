/* tapcard · точки роста
   Поиск точек для продажи NFC-карт по открытым данным OpenStreetMap.
   Без внешних библиотек: карта рисуется на canvas. */

'use strict';

/* ================= данные ================= */

const CITIES = [
  { name: 'Москва', lat: 55.7558, lon: 37.6173 },
  { name: 'Санкт-Петербург', lat: 59.9386, lon: 30.3141 },
  { name: 'Новосибирск', lat: 55.0084, lon: 82.9357 },
  { name: 'Екатеринбург', lat: 56.8389, lon: 60.6057 },
  { name: 'Казань', lat: 55.7963, lon: 49.1088 },
  { name: 'Нижний Новгород', lat: 56.3269, lon: 44.0059 },
  { name: 'Челябинск', lat: 55.1644, lon: 61.4368 },
  { name: 'Самара', lat: 53.1959, lon: 50.1002 },
  { name: 'Омск', lat: 54.9885, lon: 73.3242 },
  { name: 'Ростов-на-Дону', lat: 47.2225, lon: 39.7188 },
  { name: 'Уфа', lat: 54.7388, lon: 55.9721 },
  { name: 'Красноярск', lat: 56.0097, lon: 92.8526 },
  { name: 'Пермь', lat: 58.0105, lon: 56.2502 },
  { name: 'Воронеж', lat: 51.6720, lon: 39.1843 },
  { name: 'Волгоград', lat: 48.7080, lon: 44.5133 },
  { name: 'Краснодар', lat: 45.0355, lon: 38.9753 },
  { name: 'Саратов', lat: 51.5336, lon: 46.0343 },
  { name: 'Тюмень', lat: 57.1522, lon: 65.5272 },
  { name: 'Сочи', lat: 43.5855, lon: 39.7231 },
  { name: 'Владивосток', lat: 43.1155, lon: 131.8855 }
];

/* w — потенциал категории для продажи NFC-карт (0–10) */
const RULES = [
  { id: 'restaurant',  label: 'Рестораны',                  w: 10, q: '["amenity"="restaurant"]',                                 match: t => t.amenity === 'restaurant' },
  { id: 'hairdresser', label: 'Барбершопы и парикмахерские', w: 10, q: '["shop"="hairdresser"]',                                  match: t => t.shop === 'hairdresser' },
  { id: 'beauty',      label: 'Салоны красоты',             w: 10, q: '["shop"="beauty"]',                                       match: t => t.shop === 'beauty' },
  { id: 'dentist',     label: 'Стоматологии',               w: 10, q: '["amenity"="dentist"]',                                    match: t => t.amenity === 'dentist' || t.healthcare === 'dentist' },
  { id: 'hotel',       label: 'Отели и гостиницы',          w: 10, q: '["tourism"~"^(hotel|guest_house|hostel|motel|apartment)$"]', match: t => ['hotel', 'guest_house', 'hostel', 'motel', 'apartment'].includes(t.tourism) },
  { id: 'cafe',        label: 'Кафе и кофейни',             w: 9,  q: '["amenity"="cafe"]',                                        match: t => t.amenity === 'cafe' },
  { id: 'spa',         label: 'СПА и массаж',               w: 9,  q: '["leisure"="spa"]',                                         match: t => t.leisure === 'spa' || t.shop === 'massage' },
  { id: 'clinic',      label: 'Клиники и медцентры',        w: 9,  q: '["amenity"~"^(clinic|doctors)$"]',                         match: t => ['clinic', 'doctors', 'doctor'].includes(t.amenity) || ['clinic', 'doctor', 'centre'].includes(t.healthcare) },
  { id: 'veterinary',  label: 'Ветклиники',                 w: 9,  q: '["amenity"="veterinary"]',                                   match: t => t.amenity === 'veterinary' || t.healthcare === 'veterinary' },
  { id: 'carservice',  label: 'Автосервисы и шиномонтаж',   w: 9,  q: '["shop"~"^(car_repair|tyres)$"]',                          match: t => ['car_repair', 'tyres'].includes(t.shop) || t.amenity === 'car_repair' },
  { id: 'fitness',     label: 'Фитнес и спортзалы',         w: 9,  q: '["leisure"~"^(fitness_centre|sports_centre)$"]',            match: t => ['fitness_centre', 'sports_centre'].includes(t.leisure) || t.amenity === 'gym' },
  { id: 'tattoo',      label: 'Тату-салоны',                w: 9,  q: '["shop"="tattoo"]',                                         match: t => t.shop === 'tattoo' },
  { id: 'bar',         label: 'Бары и пабы',                w: 8,  q: '["amenity"~"^(bar|pub|biergarten)$"]',                      match: t => ['bar', 'pub', 'biergarten'].includes(t.amenity) },
  { id: 'carwash',     label: 'Автомойки',                  w: 8,  q: '["amenity"="car_wash"]',                                    match: t => t.amenity === 'car_wash' },
  { id: 'carshow',     label: 'Автосалоны',                 w: 8,  q: '["shop"="car"]',                                            match: t => t.shop === 'car' },
  { id: 'fastfood',    label: 'Фастфуд',                    w: 7,  q: '["amenity"="fast_food"]',                                    match: t => t.amenity === 'fast_food' },
  { id: 'bakery',      label: 'Пекарни и кондитерские',     w: 7,  q: '["shop"~"^(bakery|pastry|confectionery)$"]',               match: t => ['bakery', 'pastry', 'confectionery'].includes(t.shop) },
  { id: 'optician',    label: 'Оптика',                     w: 7,  q: '["shop"="optician"]',                                       match: t => t.shop === 'optician' },
  { id: 'photo',       label: 'Фотостудии',                 w: 7,  q: '["shop"="photo"]',                                          match: t => t.shop === 'photo' || t.craft === 'photographer' },
  { id: 'jewelry',     label: 'Ювелирные',                  w: 7,  q: '["shop"="jewelry"]',                                        match: t => t.shop === 'jewelry' },
  { id: 'cleaning',    label: 'Химчистки и прачечные',      w: 7,  q: '["shop"~"^(dry_cleaning|laundry)$"]',                      match: t => ['dry_cleaning', 'laundry'].includes(t.shop) },
  { id: 'coworking',   label: 'Коворкинги',                 w: 7,  q: '["office"="coworking"]',                                    match: t => t.office === 'coworking' || t.amenity === 'coworking_space' },
  { id: 'florist',     label: 'Цветочные',                  w: 6,  q: '["shop"="florist"]',                                        match: t => t.shop === 'florist' },
  { id: 'pet',         label: 'Зоомагазины',                w: 6,  q: '["shop"="pet"]',                                            match: t => t.shop === 'pet' },
  { id: 'furniture',   label: 'Мебель',                     w: 6,  q: '["shop"="furniture"]',                                      match: t => t.shop === 'furniture' },
  { id: 'travel',      label: 'Турагентства',               w: 6,  q: '["shop"="travel_agency"]',                                  match: t => t.shop === 'travel_agency' || t.office === 'travel_agent' },
  { id: 'clothes',     label: 'Одежда и обувь',             w: 5,  q: '["shop"~"^(clothes|shoes)$"]',                              match: t => ['clothes', 'shoes'].includes(t.shop) },
  { id: 'pharmacy',    label: 'Аптеки',                     w: 4,  q: '["amenity"="pharmacy"]',                                    match: t => t.amenity === 'pharmacy' },
  { id: 'supermarket', label: 'Супермаркеты',               w: 3,  q: '["shop"~"^(supermarket|convenience)$"]',                    match: t => ['supermarket', 'convenience'].includes(t.shop) }
];

const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter'
];

const CELL_M = 400;
const MAX_MARKERS = 900;
const MAX_LIST = 400;

/* ================= состояние ================= */

const state = {
  city: CITIES[0],
  center: { lat: CITIES[0].lat, lon: CITIES[0].lon },
  radius: 2000,
  enabled: new Set(RULES.filter(r => r.w >= 8).map(r => r.id)),
  pois: [],
  zones: [],
  zoneFilter: null,
  minGrade: 0,
  loading: false,
  roads: []
};

/* ================= утилиты ================= */

const $ = sel => document.querySelector(sel);

function toast(msg, ms = 2800) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove('show'), ms);
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function grade(score) {
  if (score >= 80) return 'a';
  if (score >= 60) return 'b';
  return 'c';
}

/* ================= карта на canvas ================= */

class SpotMap {
  constructor(canvas, onPick) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.center = { lat: 55.7558, lon: 37.6173 };
    this.zoom = 13;
    this.pois = [];
    this.zones = [];
    this.roads = [];
    this.hover = null;
    this.onPick = onPick || (() => {});
    this.w = 0; this.h = 0; this.dpr = 1;
    this.radius = 2000;
    this._drag = null;
    this._bind();
    this._ro = new ResizeObserver(() => this.resize());
    this._ro.observe(canvas.parentElement);
    this.resize();
  }

  /* --- проекция --- */
  static worldSize(z) { return 256 * Math.pow(2, z); }

  project(lat, lon) {
    const ws = SpotMap.worldSize(this.zoom);
    const x = (lon + 180) / 360 * ws;
    const s = Math.sin(lat * Math.PI / 180);
    const y = (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * ws;
    return { x, y };
  }

  unproject(x, y) {
    const ws = SpotMap.worldSize(this.zoom);
    const lon = x / ws * 360 - 180;
    const n = Math.PI - 2 * Math.PI * y / ws;
    const lat = 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
    return { lat, lon };
  }

  metersPerPx() {
    return 156543.03392 * Math.cos(this.center.lat * Math.PI / 180) / Math.pow(2, this.zoom);
  }

  toScreen(lat, lon) {
    const c = this.project(this.center.lat, this.center.lon);
    const p = this.project(lat, lon);
    return { x: p.x - c.x + this.w / 2, y: p.y - c.y + this.h / 2 };
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.dpr = Math.min(3, window.devicePixelRatio || 1);
    let w = Math.round(rect.width);
    let h = Math.round(rect.height);
    if (!(w > 0)) w = 800;
    if (!(h > 120) || h > 1000) h = 430;       // защита от цикла «canvas → родитель → canvas»
    w = Math.max(200, w);
    if (w === this.w && h === this.h) { this.draw(); return; }
    this.w = w;
    this.h = h;
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.draw();
  }

  setCenter(lat, lon, zoom) {
    this.center = { lat, lon };
    if (zoom) this.zoom = zoom;
    this.draw();
  }

  setData({ pois, zones, roads, radius }) {
    if (pois) this.pois = pois;
    if (zones) this.zones = zones;
    if (roads) this.roads = roads;
    if (radius) this.radius = radius;
    this.draw();
  }

  fit(pois) {
    const pts = pois || this.pois;
    if (!pts.length) { this.draw(); return; }
    let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
    pts.forEach(p => {
      minLat = Math.min(minLat, p.lat); maxLat = Math.max(maxLat, p.lat);
      minLon = Math.min(minLon, p.lon); maxLon = Math.max(maxLon, p.lon);
    });
    this.center = { lat: (minLat + maxLat) / 2, lon: (minLon + maxLon) / 2 };
    for (let z = 17; z >= 9; z--) {
      this.zoom = z;
      const a = this.toScreen(minLat, minLon);
      const b = this.toScreen(maxLat, maxLon);
      if (Math.abs(b.x - a.x) < this.w * 0.82 && Math.abs(b.y - a.y) < this.h * 0.82) break;
    }
    this.draw();
  }

  /* --- события --- */
  _bind() {
    const c = this.canvas;
    c.addEventListener('pointerdown', e => {
      c.setPointerCapture(e.pointerId);
      const cw = this.project(this.center.lat, this.center.lon);
      this._drag = { x: e.clientX, y: e.clientY, wx: cw.x, wy: cw.y, moved: false };
      c.style.cursor = 'grabbing';
    });
    c.addEventListener('pointermove', e => {
      if (this._drag) {
        const dx = e.clientX - this._drag.x;
        const dy = e.clientY - this._drag.y;
        if (Math.abs(dx) + Math.abs(dy) > 3) this._drag.moved = true;
        const p = this.unproject(this._drag.wx - dx, this._drag.wy - dy);
        this.center = p;
        this.hover = null;
        this.draw();
        return;
      }
      const rect = c.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      let best = null, bd = 14;
      this.pois.slice(0, MAX_MARKERS).forEach(p => {
        const s = this.toScreen(p.lat, p.lon);
        const d = Math.hypot(s.x - mx, s.y - my);
        if (d < bd) { bd = d; best = p; }
      });
      if (best !== this.hover) { this.hover = best; this.draw(); }
      c.style.cursor = this._drag ? 'grabbing' : best ? 'pointer' : 'grab';
    });
    const end = () => {
      if (this._drag) {
        const dragged = this._drag.moved;
        this._drag = null;
        c.style.cursor = 'grab';
        if (!dragged && this.hover) {
          this.onPick(this.hover);
        }
      }
    };
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', end);
    c.addEventListener('pointerleave', () => { this._drag = null; this.hover = null; this.draw(); });
    c.addEventListener('wheel', e => {
      e.preventDefault();
      const rect = c.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const before = this._geoAt(mx, my);
      this.zoom = Math.max(9, Math.min(18, this.zoom + (e.deltaY > 0 ? -0.5 : 0.5)));
      const after = this.toScreen(before.lat, before.lon);
      const cw = this.project(this.center.lat, this.center.lon);
      const p = this.unproject(cw.x + (after.x - mx), cw.y + (after.y - my));
      this.center = p;
      this.draw();
    }, { passive: false });
    c.addEventListener('dblclick', () => {
      this.zoom = Math.min(18, this.zoom + 1);
      this.draw();
    });
  }

  _geoAt(px, py) {
    const cw = this.project(this.center.lat, this.center.lon);
    return this.unproject(cw.x + (px - this.w / 2), cw.y + (py - this.h / 2));
  }

  /* --- отрисовка --- */
  draw() {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);

    ctx.fillStyle = '#0B100E';
    ctx.fillRect(0, 0, this.w, this.h);

    // круг радиуса поиска
    if (this.radius) {
      const c = this.toScreen(this.center.lat, this.center.lon);
      const r = this.radius / this.metersPerPx();
      if (r > 4) {
        ctx.beginPath();
        ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(55,240,160,.03)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(55,240,160,.18)';
        ctx.setLineDash([6, 6]);
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    this.drawRoads(ctx);
    this.drawZones(ctx);
    this.drawPois(ctx);
    this.drawHover(ctx);
    this.drawChrome(ctx);
  }

  drawRoads(ctx) {
    if (!this.roads.length) return;
    const style = {
      motorway: [3.0, 'rgba(150,180,170,.42)'],
      trunk: [2.8, 'rgba(150,180,170,.40)'],
      primary: [2.4, 'rgba(140,170,160,.34)'],
      secondary: [2.0, 'rgba(130,160,150,.30)'],
      tertiary: [1.6, 'rgba(120,150,140,.26)'],
      residential: [1.1, 'rgba(110,140,130,.22)'],
      living_street: [1.0, 'rgba(110,140,130,.20)'],
      pedestrian: [1.0, 'rgba(110,140,130,.18)'],
      unclassified: [1.0, 'rgba(110,140,130,.18)']
    };
    this.roads.forEach(w => {
      const st = style[w.cls] || style.residential;
      ctx.beginPath();
      let started = false;
      w.coords.forEach(([lat, lon]) => {
        const s = this.toScreen(lat, lon);
        if (!started) { ctx.moveTo(s.x, s.y); started = true; }
        else ctx.lineTo(s.x, s.y);
      });
      ctx.strokeStyle = st[1];
      ctx.lineWidth = st[0];
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.stroke();
    });
  }

  drawZones(ctx) {
    if (!this.zones.length) return;
    const sizeM = CELL_M;
    this.zones.forEach((z, i) => {
      const px = sizeM / this.metersPerPx();
      const s = this.toScreen(z.lat, z.lon);
      if (s.x < -px || s.y < -px || s.x > this.w + px || s.y > this.h + px) return;
      const hot = i < 3;
      ctx.beginPath();
      const r = Math.min(10, px / 6);
      roundRect(ctx, s.x - px / 2, s.y - px / 2, px, px, r);
      ctx.fillStyle = hot ? 'rgba(55,240,160,.10)' : 'rgba(255,255,255,.03)';
      ctx.fill();
      ctx.strokeStyle = hot ? 'rgba(55,240,160,.45)' : 'rgba(255,255,255,.12)';
      ctx.lineWidth = 1;
      ctx.stroke();
      if (px > 46) {
        ctx.fillStyle = hot ? 'rgba(201,247,224,.85)' : 'rgba(152,166,159,.8)';
        ctx.font = '600 11px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(z.count + ' · ' + z.avg, s.x, s.y);
      }
    });
  }

  drawPois(ctx) {
    const list = this.pois.slice(0, MAX_MARKERS);
    list.forEach(p => {
      const s = this.toScreen(p.lat, p.lon);
      if (s.x < -12 || s.y < -12 || s.x > this.w + 12 || s.y > this.h + 12) return;
      const g = grade(p.score);
      const color = g === 'a' ? '#37F0A0' : g === 'b' ? '#FFC94A' : '#6F7D76';
      const r = g === 'a' ? 6.5 : g === 'b' ? 5.5 : 4.5;
      if (g === 'a') {
        ctx.beginPath();
        ctx.arc(s.x, s.y, r + 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(55,240,160,.16)';
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.85;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = 'rgba(7,10,9,.85)';
      ctx.stroke();
    });
  }

  drawHover(ctx) {
    if (!this.hover) return;
    const p = this.hover;
    const s = this.toScreen(p.lat, p.lon);
    const g = grade(p.score);
    const color = g === 'a' ? '#37F0A0' : g === 'b' ? '#FFC94A' : '#6F7D76';

    ctx.beginPath();
    ctx.arc(s.x, s.y, 11, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();

    const lines = [
      p.name,
      p.cat + ' · ' + p.score,
      p.address !== '—' ? p.address : ''
    ].filter(Boolean);

    ctx.font = '600 12px system-ui, sans-serif';
    const widths = lines.map((l, i) => {
      ctx.font = (i === 0 ? '700 13px' : '400 12px') + ' system-ui, sans-serif';
      return ctx.measureText(l).width;
    });
    const bw = Math.min(this.w - 24, Math.max(...widths) + 24);
    const bh = 16 + lines.length * 17;
    let bx = s.x - bw / 2;
    let by = s.y - bh - 16;
    bx = Math.max(8, Math.min(this.w - bw - 8, bx));
    if (by < 8) by = s.y + 18;

    ctx.beginPath();
    roundRect(ctx, bx, by, bw, bh, 10);
    ctx.fillStyle = 'rgba(9,15,12,.94)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.12)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    lines.forEach((l, i) => {
      if (i === 0) {
        ctx.font = '700 13px system-ui, sans-serif';
        ctx.fillStyle = '#F1F5F2';
      } else if (i === 1) {
        ctx.font = '400 12px system-ui, sans-serif';
        ctx.fillStyle = color;
      } else {
        ctx.font = '400 12px system-ui, sans-serif';
        ctx.fillStyle = '#98A69F';
      }
      ctx.fillText(l, bx + 12, by + 8 + i * 17);
    });
  }

  drawChrome(ctx) {
    // масштабная линейка
    const mpp = this.metersPerPx();
    const target = 90 * mpp;
    const pow = Math.pow(10, Math.floor(Math.log10(target)));
    const mult = [1, 2, 5, 10].find(m => m * pow >= target) || 10;
    const meters = mult * pow;
    const px = meters / mpp;
    const x0 = 14, y0 = this.h - 20;
    ctx.beginPath();
    ctx.moveTo(x0, y0); ctx.lineTo(x0 + px, y0);
    ctx.moveTo(x0, y0 - 4); ctx.lineTo(x0, y0 + 4);
    ctx.moveTo(x0 + px, y0 - 4); ctx.lineTo(x0 + px, y0 + 4);
    ctx.strokeStyle = 'rgba(241,245,242,.55)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = 'rgba(241,245,242,.6)';
    ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(meters >= 1000 ? (meters / 1000) + ' км' : meters + ' м', x0 + px + 8, y0 + 4);

    // подпись
    ctx.fillStyle = 'rgba(152,166,159,.5)';
    ctx.font = '10px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('© OpenStreetMap', this.w - 10, this.h - 8);
  }
}

function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* ================= интерфейс ================= */

function fillCities() {
  const sel = $('#city');
  CITIES.forEach((c, i) => {
    const o = document.createElement('option');
    o.value = String(i);
    o.textContent = c.name;
    sel.appendChild(o);
  });
  const geo = document.createElement('option');
  geo.value = 'geo';
  geo.textContent = 'Моё местоположение';
  geo.disabled = true;
  sel.appendChild(geo);
}

function renderCats() {
  const box = $('#cats');
  box.textContent = '';
  RULES.forEach(r => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip' + (state.enabled.has(r.id) ? ' on' : '');
    b.textContent = r.label;
    b.title = `Потенциал ${r.w}/10`;
    b.addEventListener('click', () => {
      if (state.enabled.has(r.id)) state.enabled.delete(r.id);
      else state.enabled.add(r.id);
      b.classList.toggle('on');
      saveSettings();
    });
    box.appendChild(b);
  });
}

function updateRadiusUI() {
  $('#radiusVal').textContent = state.radius >= 1000
    ? (state.radius / 1000).toFixed(state.radius % 1000 ? 1 : 0) + ' км'
    : state.radius + ' м';
  const p = (state.radius - 500) / (10000 - 500) * 100;
  $('#radius').style.setProperty('--p', p + '%');
}

function saveSettings() {
  try {
    localStorage.setItem('tapcard-spots', JSON.stringify({
      city: state.city.name,
      radius: state.radius,
      cats: [...state.enabled]
    }));
  } catch (e) { /* ignore */ }
}

function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem('tapcard-spots') || 'null');
    if (!s) return;
    const c = CITIES.find(x => x.name === s.city);
    if (c) { state.city = c; state.center = { lat: c.lat, lon: c.lon }; $('#city').value = String(CITIES.indexOf(c)); }
    if (s.radius) { state.radius = s.radius; $('#radius').value = s.radius; }
    if (Array.isArray(s.cats) && s.cats.length) {
      const valid = s.cats.filter(id => RULES.some(r => r.id === id));
      if (valid.length) state.enabled = new Set(valid);
    }
  } catch (e) { /* ignore */ }
}

/* ================= Overpass ================= */

function buildQuery() {
  const rules = RULES.filter(r => state.enabled.has(r.id));
  if (!rules.length) return null;
  const { lat, lon } = state.center;
  const body = rules.map(r => `  nwr${r.q}(around:${state.radius},${lat},${lon});`).join('\n');
  return `[out:json][timeout:90];\n(\n${body}\n);\nout center 5000;`;
}

async function overpass(query, timeoutMs = 55000) {
  let lastErr = null;
  for (const url of ENDPOINTS) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(query),
        signal: ctrl.signal
      });
      clearTimeout(timer);
      if (!res.ok) { lastErr = new Error('HTTP ' + res.status); continue; }
      return await res.json();
    } catch (e) {
      clearTimeout(timer);
      lastErr = e;
    }
  }
  throw lastErr || new Error('Overpass недоступен');
}

async function fetchRoads() {
  const { lat, lon } = state.center;
  const r = Math.min(state.radius, 3500);
  const q = `[out:json][timeout:30];\nway["highway"~"^(motorway|trunk|primary|secondary|tertiary|residential|living_street|pedestrian|unclassified)$"](around:${r},${lat},${lon});\nout geom;`;
  try {
    const data = await overpass(q, 25000);
    return (data.elements || [])
      .filter(w => w.geometry && w.geometry.length > 1)
      .map(w => ({
        cls: w.tags?.highway || 'residential',
        coords: w.geometry.map(g => [g.lat, g.lon])
      }));
  } catch (e) {
    return [];
  }
}

/* ================= обработка ================= */

function classify(tags) {
  for (const r of RULES) {
    if (!state.enabled.has(r.id)) continue;
    if (r.match(tags)) return r;
  }
  return null;
}

function normalize(el) {
  const t = el.tags || {};
  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;
  if (lat == null || lon == null) return null;

  const rule = classify(t);
  if (!rule) return null;

  const name = t.name || t['name:ru'] || t.brand || t.operator;
  if (!name) return null;

  const street = t['addr:street'] || '';
  const house = t['addr:housenumber'] || '';
  const address = [street, house].filter(Boolean).join(', ') || '—';

  return {
    id: el.type + '/' + el.id,
    name: String(name),
    cat: rule.label,
    w: rule.w,
    lat, lon,
    address,
    phone: (t.phone || t['contact:phone'] || '').replace(/[^\d+]/g, '') || '',
    website: t.website || t['contact:website'] || t.url || '',
    hours: t.opening_hours || '',
    brand: t.brand || '',
    osm: `https://www.openstreetmap.org/${el.type}/${el.id}`,
    score: 0,
    reasons: [],
    zone: ''
  };
}

function scoreAll(pois) {
  const latRef = state.center.lat;
  const mPerDegLat = 111320;
  const mPerDegLon = 111320 * Math.cos(latRef * Math.PI / 180);

  const cell = 100;
  const grid = new Map();

  pois.forEach(p => {
    p._cx = Math.floor((p.lon * mPerDegLon) / cell);
    p._cy = Math.floor((p.lat * mPerDegLat) / cell);
    const k = p._cx + ':' + p._cy;
    grid.set(k, (grid.get(k) || 0) + 1);
  });

  pois.forEach(p => {
    let s = p.w * 5;
    const reasons = [`категория «${p.cat}» — ${p.w}/10`];
    if (p.phone) { s += 8; reasons.push('есть телефон'); }
    if (p.website) { s += 8; reasons.push('есть сайт'); }
    if (p.hours) { s += 4; reasons.push('указан график'); }
    if (p.address !== '—') s += 2;
    if (p.brand) { s -= 6; reasons.push('сеть — сложнее зайти'); }

    let near = 0;
    for (let dx = -3; dx <= 3; dx++) {
      for (let dy = -3; dy <= 3; dy++) {
        if (dx * dx + dy * dy > 9) continue;
        near += grid.get((p._cx + dx) + ':' + (p._cy + dy)) || 0;
      }
    }
    const traffic = Math.min(14, Math.round(Math.sqrt(near) * 2));
    if (traffic >= 6) reasons.push('высокий поток людей');
    s += traffic;

    p.score = Math.max(5, Math.min(100, Math.round(s)));
    p.reasons = reasons;
  });

  return pois;
}

function buildZones(pois) {
  const latRef = state.center.lat;
  const h = CELL_M / 111320;
  const w = CELL_M / (111320 * Math.cos(latRef * Math.PI / 180));
  const cells = new Map();

  pois.forEach(p => {
    const k = Math.floor(p.lon / w) + ':' + Math.floor(p.lat / h);
    if (!cells.has(k)) cells.set(k, { key: k, sum: 0, n: 0, lat: 0, lon: 0, cats: {}, a: 0 });
    const c = cells.get(k);
    c.sum += p.score; c.n += 1; c.lat += p.lat; c.lon += p.lon;
    c.cats[p.cat] = (c.cats[p.cat] || 0) + 1;
    if (p.score >= 80) c.a += 1;
    p.zone = k;
  });

  return [...cells.values()]
    .map(c => {
      const top = Object.entries(c.cats).sort((a, b) => b[1] - a[1])[0];
      return {
        key: c.key, count: c.n, a: c.a,
        avg: Math.round(c.sum / c.n), total: c.sum,
        lat: c.lat / c.n, lon: c.lon / c.n,
        topCat: top ? top[0] : '', topN: top ? top[1] : 0
      };
    })
    .sort((x, y) => y.total - x.total)
    .slice(0, 12);
}

/* ================= рендер ================= */

function renderStats() {
  const a = state.pois.filter(p => p.score >= 80).length;
  $('#statFound').textContent = state.pois.length || '—';
  $('#statA').textContent = a || '—';
  $('#statZones').textContent = state.zones.length || '—';
  $('#statRadius').textContent = (state.radius / 1000).toFixed(state.radius % 1000 ? 1 : 0);
}

function renderZones() {
  const box = $('#zones');
  box.textContent = '';
  if (!state.zones.length) {
    box.innerHTML = '<div class="empty">Запустите поиск, чтобы увидеть зоны</div>';
    return;
  }
  state.zones.forEach((z, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'zone' + (i < 3 ? ' hot' : '') + (state.zoneFilter === z.key ? ' active' : '');
    b.innerHTML =
      `<span class="kind">${z.a ? 'приоритет A · ' + z.a : 'зона ' + (i + 1)}</span>` +
      `<b>${z.count} точек · ср. ${z.avg}</b>` +
      `<small>${escapeHtml(z.topCat)}${z.topN ? ' ×' + z.topN : ''}</small>`;
    b.addEventListener('click', () => {
      state.zoneFilter = state.zoneFilter === z.key ? null : z.key;
      renderZones(); renderList();
      if (map) map.setCenter(z.lat, z.lon, 16);
    });
    box.appendChild(b);
  });
}

function renderList() {
  const box = $('#list');
  box.textContent = '';

  let list = state.pois;
  if (state.zoneFilter) list = list.filter(p => p.zone === state.zoneFilter);
  if (state.minGrade > 0) list = list.filter(p => p.score >= state.minGrade);
  list = list.slice(0, MAX_LIST);

  if (!list.length) {
    box.innerHTML = '<div class="empty">Ничего не найдено. Увеличьте радиус или включите категории.</div>';
    return;
  }

  list.forEach(p => {
    const g = grade(p.score);
    const card = document.createElement('article');
    card.className = 'poi';
    card.dataset.id = p.id;

    const top = document.createElement('div');
    top.className = 'poi-top';

    const left = document.createElement('div');
    const h = document.createElement('h3');
    h.textContent = p.name;
    const cat = document.createElement('div');
    cat.className = 'cat';
    cat.textContent = p.cat;
    left.append(h, cat);

    const sc = document.createElement('div');
    sc.className = 'score ' + g;
    sc.textContent = p.score;

    top.append(left, sc);

    const addr = document.createElement('div');
    addr.className = 'addr';
    addr.textContent = p.address;

    const meta = document.createElement('div');
    meta.className = 'meta';
    const tags = [];
    if (p.phone) tags.push(p.phone);
    if (p.website) tags.push('сайт');
    p.reasons.slice(1, 3).forEach(t => tags.push(t));
    tags.forEach(txt => {
      const t = document.createElement('span');
      t.className = 'tag';
      t.textContent = txt;
      meta.appendChild(t);
    });

    const actions = document.createElement('div');
    actions.className = 'actions';
    const y = document.createElement('a');
    y.href = `https://yandex.ru/maps/?text=${encodeURIComponent(p.name + ' ' + (p.address !== '—' ? p.address : ''))}`;
    y.target = '_blank'; y.rel = 'noopener';
    y.textContent = 'Яндекс Карты';
    const o = document.createElement('a');
    o.href = p.osm; o.target = '_blank'; o.rel = 'noopener';
    o.textContent = 'OSM';
    actions.append(y, o);

    card.append(top, addr, meta, actions);
    box.appendChild(card);
  });
}

/* ================= поиск ================= */

async function find() {
  if (state.loading) return;
  if (!state.enabled.size) { toast('Включите хотя бы одну категорию'); return; }

  state.loading = true;
  state.zoneFilter = null;

  const btn = $('#find');
  const original = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Ищем точки…';

  const roadsPromise = fetchRoads();

  try {
    const q = buildQuery();
    const data = await overpass(q);

    const seen = new Set();
    const pois = [];
    (data.elements || []).forEach(el => {
      const p = normalize(el);
      if (!p || seen.has(p.id)) return;
      seen.add(p.id);
      pois.push(p);
    });

    const roads = await roadsPromise;
    state.roads = roads;

    if (!pois.length) {
      state.pois = []; state.zones = [];
      renderStats(); renderZones(); renderList();
      if (map) map.setData({ pois: [], zones: [], roads, radius: state.radius });
      toast('Точек не найдено — увеличьте радиус');
      return;
    }

    scoreAll(pois);
    pois.sort((a, b) => b.score - a.score);
    state.pois = pois;
    state.zones = buildZones(pois);

    renderStats();
    renderZones();
    renderList();

    if (map) {
      map.setData({ pois, zones: state.zones, roads, radius: state.radius });
      map.fit(pois);
    }

    toast(`Готово: ${pois.length} точек, ${state.zones.length} зон`);
    saveSettings();
  } catch (e) {
    console.error(e);
    toast('Не удалось получить данные OSM. Проверьте интернет и попробуйте ещё раз.', 4200);
  } finally {
    state.loading = false;
    btn.disabled = false;
    btn.innerHTML = original;
  }
}

/* ================= CSV ================= */

function exportCsv() {
  const list = state.pois;
  if (!list.length) { toast('Сначала найдите точки'); return; }
  const head = ['Название', 'Категория', 'Потенциал', 'Адрес', 'Телефон', 'Сайт', 'Широта', 'Долгота', 'OSM'];
  const rows = list.map(p => [
    p.name, p.cat, p.score, p.address, p.phone, p.website,
    p.lat.toFixed(6), p.lon.toFixed(6), p.osm
  ]);
  const csv = '\uFEFF' + [head, ...rows]
    .map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';'))
    .join('\r\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `tapcard-точки-${state.city.name}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  toast('CSV скачан');
}

/* ================= события ================= */

let map = null;

function bind() {
  $('#city').addEventListener('change', e => {
    if (e.target.value === 'geo') return;
    const i = Number(e.target.value);
    state.city = CITIES[i];
    state.center = { lat: state.city.lat, lon: state.city.lon };
    if (map) map.setCenter(state.center.lat, state.center.lon, 13);
    saveSettings();
  });

  $('#radius').addEventListener('input', e => {
    state.radius = Number(e.target.value);
    updateRadiusUI();
  });
  $('#radius').addEventListener('change', saveSettings);

  $('#find').addEventListener('click', find);

  $('#minGrade').addEventListener('change', e => {
    state.minGrade = Number(e.target.value);
    renderList();
  });

  $('#export').addEventListener('click', exportCsv);

  $('#catsToggle').addEventListener('click', () => {
    const all = state.enabled.size === RULES.length;
    state.enabled = new Set(all ? RULES.filter(r => r.w >= 8).map(r => r.id) : RULES.map(r => r.id));
    renderCats();
    saveSettings();
  });

  $('#geo').addEventListener('click', () => {
    if (!navigator.geolocation) { toast('Геолокация недоступна'); return; }
    toast('Определяем местоположение…');
    navigator.geolocation.getCurrentPosition(
      pos => {
        state.center = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        $('#city').value = 'geo';
        if (map) map.setCenter(state.center.lat, state.center.lon, 15);
        toast('Локация определена');
      },
      () => toast('Не удалось определить локацию. Выберите город.'),
      { enableHighAccuracy: false, timeout: 10000 }
    );
  });
}

/* ================= старт ================= */

document.addEventListener('DOMContentLoaded', () => {
  fillCities();
  renderCats();
  loadSettings();
  updateRadiusUI();
  bind();

  map = new SpotMap($('#map'), poi => {
    const card = document.querySelector(`.poi[data-id="${poi.id}"]`);
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.classList.add('picked');
      setTimeout(() => card.classList.remove('picked'), 1400);
    }
  });
  map.setCenter(state.center.lat, state.center.lon, 13);

  renderStats();
});
