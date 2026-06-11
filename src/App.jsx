import { useState, useEffect, useRef } from "react";

const SB_URL = "https://wljxplbcfoorqpoflcdz.supabase.co";
const SB_KEY = "sb_publishable_zsHh-eOarHI7BSGtuP6WWQ_PQ4ACoHG";
const WHATSAPP_NUMBER = "201091011380";
const FREE_SHIPPING_THRESHOLD = 5000;
const BOSTA_SHIPPING_RATES = {
  'القاهرة':        118,
  'القاهره':        118,
  'الجيزة':         118,
  'الجيزه':         118,
  'الإسكندرية':    124,
  'الاسكندريه':    124,
  'الإسكندريه':    124,
  'البحيرة':        124,
  'البحيره':        124,
  'الدقهلية':       131,
  'الدقهليه':       131,
  'القليوبية':      131,
  'القليوبيه':      131,
  'الغربية':        131,
  'الغربيه':        131,
  'كفر الشيخ':      131,
  'المنوفية':       131,
  'المنوفيه':       131,
  'الشرقية':        131,
  'الشرقيه':        131,
  'الإسماعيلية':    131,
  'الاسماعيليه':    131,
  'السويس':         131,
  'بورسعيد':        131,
  'بور سعيد':       131,
  'دمياط':          131,
  'الفيوم':         146,
  'بني سويف':       146,
  'المنيا':         146,
  'أسيوط':          146,
  'اسيوط':          146,
  'سوهاج':          146,
  'قنا':            162,
  'الأقصر':         162,
  'الاقصر':         162,
  'أسوان':          162,
  'اسوان':          162,
  'البحر الأحمر':   162,
  'مرسي مطروح':     162,
  'مطروح':          162,
  'الساحل الشمالي': 166,
  'شمال سيناء':     182,
  'جنوب سيناء':     182,
  'الوادي الجديد':  182,
};
const sb = async (path, opts = {}) => {
  const { prefer, ...fetchOpts } = opts;
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      "Content-Type": "application/json",
      Prefer: prefer || "return=representation",
      ...opts.headers,
    },
    ...fetchOpts,
  });
  if (!res.ok) { const t = await res.text(); throw new Error(t); }
  return res.json().catch(() => null);
};

const sbUpload = async (bucket, path, file) => {
  const res = await fetch(`${SB_URL}/storage/v1/object/${bucket}/${path}`, {
    method: "POST",
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": file.type, "x-upsert": "true" },
    body: file,
  });
  if (!res.ok) throw new Error(await res.text());
  return `${SB_URL}/storage/v1/object/public/${bucket}/${path}`;
};

const mkCode = () => "ORD-" + Math.random().toString(36).substring(2, 7).toUpperCase();
const fmtEGP = (n) => new Intl.NumberFormat("ar-EG").format(Math.round(n));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const optimizeImg = (url, width = 600) => {
  if (!url || !url.includes('supabase.co')) return url;
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=${width}&output=webp&q=80`;
};

const CATS = [
  { id: "electric",  ar: "أدوات كهربائية",    en: "Electric Tools",      icon: "bolt" },
  { id: "battery",   ar: "أدوات بطارية",      en: "Battery Tools",       icon: "battery" },
  { id: "hand",      ar: "عدد يدوية",         en: "Hand Tools",          icon: "wrench" },
  { id: "measuring", ar: "أدوات قياس",        en: "Measuring Tools",     icon: "ruler" },
  { id: "safety",    ar: "أدوات السلامة",     en: "Safety Tools",        icon: "helmet" },
  { id: "car",       ar: "أدوات السيارات",    en: "Car Tools",           icon: "car" },
  { id: "",    ar: "أدوات الحدائق",     en: "Gardening Tools",     icon: "leaf" },
  { id: "sets",      ar: "اطقم أدوات وكومبو", en: "Tool Sets & Combos",  icon: "case" },
  { id: "new",       ar: "وصل حديثاً",        en: "New Arrivals",        icon: "star" },
  { id: "offers",    ar: "عروض اليوم",        en: "Daily Offers",        icon: "tag" },
];
const PINNED_TOP_SELLING = ['tidli426981','thkthp41487','thkthp90076','thkthp41667','tws10501','tpwli20362','web1520','th118366'];
const PINNED_BATTERY = ['tagli271532','trhli202689','th2130016','wcdp522'];
const PINNED_ELECTRIC = ['td45658','tg10711556','tg10911576','tws10501','th118366'];

const sortPinned = (items, pinnedCodes) => {
  const lower = pinnedCodes.map(c => c.toLowerCase());
  const pinned = [];
  const rest = [];
  // First pass: collect pinned in order
  for (const code of lower) {
    const found = items.find(p => (p.code || '').toLowerCase() === code);
    if (found) pinned.push(found);
  }
  // Second pass: collect the rest
  for (const p of items) {
    if (!lower.includes((p.code || '').toLowerCase())) rest.push(p);
  }
  return [...pinned, ...rest];
};

const STATUS_MAP = {
  Processing: { ar: "قيد المعالجة", color: "#E8A83A" },
  Confirmed:  { ar: "مؤكد",         color: "#1E5BA8" },
  Shipped:    { ar: "في الطريق",    color: "#7B3FBE" },
  Delivered:  { ar: "تم التسليم",   color: "#2F8F4F" },
  Cancelled:  { ar: "ملغي",         color: "#D4352A" },
};

/* ─── CSS ─────────────────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=JetBrains+Mono:wght@500;700&display=swap');
*{box-sizing:border-box;}html,body{margin:0;padding:0;overflow-x:hidden;}
:root{
  --brand:#F26A21;--brand-ink:#C04E0F;--brand-soft:#FFE9DA;
  --ink:oklch(0.18 0.01 50);--ink-2:oklch(0.32 0.01 50);--ink-3:oklch(0.50 0.01 50);--mute:oklch(0.65 0.008 50);
  --bg:oklch(0.985 0.004 70);--bg-2:oklch(0.965 0.005 70);--bg-3:oklch(0.93 0.006 70);
  --line:oklch(0.88 0.006 60);--line-2:oklch(0.82 0.008 60);
  --green:#2F8F4F;--red:#D4352A;
  --shadow-sm:0 1px 0 rgba(18,20,22,.04),0 1px 2px rgba(18,20,22,.06);
  --shadow-md:0 2px 0 rgba(18,20,22,.04),0 8px 24px rgba(18,20,22,.08);
  --radius:4px;--radius-md:8px;
  --f-ar:'Cairo',system-ui,sans-serif;--f-mono:'JetBrains Mono','Cairo',monospace;
  --wrap:1400px;
}
[data-theme="dark"]{
  --ink:oklch(0.96 0.005 70);--ink-2:oklch(0.85 0.005 70);--ink-3:oklch(0.68 0.005 70);
  --bg:oklch(0.16 0.008 50);--bg-2:oklch(0.21 0.008 50);--bg-3:oklch(0.26 0.01 50);
  --line:oklch(0.30 0.008 50);--line-2:oklch(0.38 0.008 50);
  --brand-soft:color-mix(in oklch,var(--brand),black 60%);
}
body{font-family:var(--f-ar);background:var(--bg);color:var(--ink);direction:rtl;-webkit-font-smoothing:antialiased;}
.wrap{max-width:var(--wrap);margin:0 auto;padding:0 16px;}
a{color:inherit;text-decoration:none;}
button{font-family:inherit;cursor:pointer;border:0;background:none;color:inherit;}
input,select,textarea{font-family:inherit;}
.num{font-family:var(--f-mono);font-size:0.72rem;color:var(--brand);letter-spacing:0.04em;}
.btn{display:inline-flex;align-items:center;gap:8px;padding:12px 20px;border-radius:var(--radius);font-weight:700;font-size:0.92rem;transition:all .15s;border:1.5px solid transparent;white-space:nowrap;}
.btn.lg{padding:16px 28px;font-size:1rem;}.btn.sm{padding:8px 14px;font-size:0.82rem;}
.btn-primary{background:var(--brand);color:#fff;border-color:var(--brand);}.btn-primary:hover{background:var(--brand-ink);}
.btn-dark{background:var(--ink);color:var(--bg);}.btn-dark:hover{opacity:.85;}
.btn-ghost{border-color:var(--line-2);color:var(--ink);background:var(--bg);}.btn-ghost:hover{border-color:var(--ink);}
.btn-block{width:100%;justify-content:center;}
.icon-btn{width:36px;height:36px;display:grid;place-items:center;border-radius:var(--radius);border:1px solid var(--line);background:var(--bg);flex-shrink:0;}
.icon-btn:hover{border-color:var(--ink);}

/* TOPBAR */
.site-header{position:sticky;top:0;z-index:40;background:var(--bg);border-bottom:1px solid var(--line);}
.topbar{background:var(--ink);color:rgba(255,255,255,.75);font-size:0.75rem;display:none;}
@media(min-width:768px){.topbar{display:block;}}
.topbar-inner{display:flex;justify-content:space-between;align-items:center;height:34px;}
.tb-left,.tb-right{display:flex;align-items:center;gap:12px;}
.tb-item{display:inline-flex;align-items:center;gap:5px;}
.tb-sep{width:1px;height:14px;background:rgba(255,255,255,0.12);}
.tb-btn{display:inline-flex;align-items:center;gap:6px;color:inherit;font-weight:600;font-size:0.75rem;padding:4px 2px;}.tb-btn:hover{color:#fff;}
.tb-link{display:inline-flex;align-items:center;gap:6px;color:var(--brand);font-weight:700;font-family:var(--f-mono);}

/* HEADER */
.hdr{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:12px;padding:10px 16px;}
@media(max-width:767px){.hdr{grid-template-columns:auto 1fr auto;gap:8px;padding:8px 12px;}}
.brand-btn{display:inline-flex;align-items:center;gap:10px;background:none;border:0;padding:0;cursor:pointer;}
.brand-mark{width:68px;height:68px;border-radius:8px;overflow:hidden;background:#fff;display:grid;place-items:center;box-shadow:0 2px 12px rgba(242,106,33,0.25);border:2px solid var(--brand);flex-shrink:0;}
.brand-mark img{width:100%;height:100%;object-fit:contain;}
.brand-text b{display:block;font-size:1rem;line-height:1;}
.brand-text small{display:block;font-family:var(--f-mono);font-size:0.62rem;color:var(--ink-3);letter-spacing:0.06em;margin-top:3px;}
@media(max-width:480px){.brand-text{display:none;}}
.search{display:flex;align-items:stretch;border:2px solid var(--ink);border-radius:var(--radius);overflow:hidden;background:var(--bg);height:44px;}
.search-input{flex:1;border:0;background:transparent;padding:0 12px;font-size:0.9rem;color:var(--ink);outline:none;min-width:0;}
.search-input::placeholder{color:var(--mute);font-size:0.85rem;}
.search-btn{background:var(--brand);color:#fff;padding:0 14px;display:inline-flex;align-items:center;gap:6px;font-weight:700;border:0;flex-shrink:0;}.search-btn:hover{background:var(--brand-ink);}
.hdr-right{display:flex;gap:6px;align-items:center;}
.hdr-pill{display:inline-flex;align-items:center;gap:8px;padding:8px 12px;border-radius:var(--radius);border:1px solid var(--line);background:var(--bg);position:relative;cursor:pointer;white-space:nowrap;}.hdr-pill:hover{border-color:var(--ink);}
.hdr-pill-t{display:flex;flex-direction:column;align-items:flex-start;line-height:1.1;}
.hdr-pill-t small{font-size:0.62rem;color:var(--ink-3);}.hdr-pill-t b{font-size:0.82rem;}
@media(max-width:600px){.hdr-pill-t{display:none;}}
.hdr-cart-badge{position:absolute;top:-6px;inset-inline-end:-6px;width:20px;height:20px;background:var(--brand);color:#fff;border-radius:50%;display:grid;place-items:center;font-size:0.7rem;font-weight:800;font-family:var(--f-mono);border:2px solid var(--bg);}

/* NAVBAR */
.navbar{border-top:1px solid var(--line);background:var(--bg);position:relative;}
.nav-inner{display:flex;align-items:center;height:44px;padding:0 8px;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;}
.nav-inner::-webkit-scrollbar{display:none;}
.nav-all{display:inline-flex;align-items:center;gap:6px;padding:0 12px;height:44px;background:var(--ink);color:var(--bg);font-weight:700;font-size:0.85rem;margin-inline-end:6px;flex-shrink:0;border:0;white-space:nowrap;}.nav-all:hover{background:var(--brand);}
.nav-link{padding:0 10px;height:44px;display:inline-flex;align-items:center;gap:5px;font-weight:600;font-size:0.85rem;color:var(--ink-2);white-space:nowrap;}.nav-link:hover{color:var(--brand);}
.nav-link.hot{color:var(--brand);}.nav-link.hot::before{content:"";width:6px;height:6px;background:var(--brand);border-radius:50%;}
.nav-link.muted{color:var(--ink-3);}
.nav-spacer{flex:1;min-width:12px;}

/* MEGA */
.mega{position:absolute;top:100%;inset-inline-start:0;right:0;width:100%;background:var(--bg);border-top:1px solid var(--line);box-shadow:var(--shadow-md);z-index:30;}
.mega-inner{display:grid;grid-template-columns:260px 1fr;}
.mega-cats{border-inline-end:1px solid var(--line);padding:10px 0;background:var(--bg-2);}
.mega-cat{display:flex;align-items:center;gap:10px;padding:9px 16px;}.mega-cat:hover{background:var(--brand-soft);color:var(--brand-ink);}
.mega-cat-icon{width:32px;height:32px;display:grid;place-items:center;background:var(--bg);border:1px solid var(--line);border-radius:var(--radius);color:var(--brand);flex-shrink:0;}
.mega-cat-text b{display:block;font-size:0.88rem;}.mega-cat-text small{display:block;font-family:var(--f-mono);font-size:0.66rem;color:var(--ink-3);}
.mega-cat-chev{margin-inline-start:auto;opacity:0.4;}

/* HERO */
.hero{position:relative;background:var(--bg);}
.hero-a{padding:24px 0 0;border-bottom:1px solid var(--line);}
.hero-lead{display:flex;flex-direction:column;justify-content:center;}
.hero-two-col{display:grid;grid-template-columns:1fr 1fr;gap:32px;align-items:center;padding:48px 0 32px;}
@media(max-width:768px){
  .hero-two-col{grid-template-columns:1fr!important;gap:16px;padding:28px 0 0;}
  .hero-imgs{order:2;}
  .hero-lead{order:1;}
}
@media(max-width:768px){.hero-two-col{grid-template-columns:1fr!important;}.hero-imgs{display:none;}}


/* TICKER */
.ticker{border-top:1px solid var(--line);background:var(--bg-2);overflow:hidden;font-family:var(--f-mono);font-size:0.76rem;letter-spacing:0.04em;}
.ticker-track{display:flex;gap:32px;padding:9px 0;white-space:nowrap;animation:slide-rtl 40s linear infinite;}
.ticker-group{display:inline-flex;gap:24px;align-items:center;}
.ticker-group span{display:inline-flex;align-items:center;gap:5px;color:var(--ink-2);}
.ticker-group .dot{color:var(--brand);}
@keyframes slide-rtl{from{transform:translateX(0);}to{transform:translateX(100%);}}

/* SECTIONS */
.section{padding:48px 0;}
.sec-head{display:flex;align-items:baseline;gap:14px;margin-bottom:24px;flex-wrap:wrap;}
.sec-eyebrow{display:inline-flex;align-items:center;gap:8px;font-size:0.78rem;color:var(--ink-2);}
.sec-title{margin:0;font-size:clamp(1.4rem,3vw,1.9rem);font-weight:900;letter-spacing:-0.01em;}
.sec-rule{flex:1;height:1px;background:var(--line);min-width:20px;}
.sec-cta{font-size:0.88rem;font-weight:700;color:var(--brand);display:inline-flex;align-items:center;gap:4px;white-space:nowrap;}
.rail{display:grid;gap:14px;}
.rail-2{grid-template-columns:repeat(2,1fr);}
.rail-3{grid-template-columns:repeat(3,1fr);}
.rail-4{grid-template-columns:repeat(4,1fr);}
@media(max-width:1100px){.rail-4{grid-template-columns:repeat(2,1fr);}.rail-3{grid-template-columns:repeat(2,1fr);}}
@media(max-width:600px){.rail-4,.rail-3,.rail-2{grid-template-columns:repeat(2,1fr);}}
.tabs{display:flex;gap:2px;margin-bottom:18px;padding-bottom:4px;border-bottom:1px solid var(--line);align-items:center;overflow-x:auto;}
.tab{padding:9px 14px;font-size:0.85rem;font-weight:700;color:var(--ink-3);border-bottom:2px solid transparent;margin-bottom:-1px;white-space:nowrap;}.tab:hover{color:var(--ink);}.tab.on{color:var(--ink);border-bottom-color:var(--brand);}
.tabs-spacer{flex:1;}
.tabs-filter{display:inline-flex;align-items:center;gap:5px;padding:7px 11px;border:1px solid var(--line);border-radius:var(--radius);font-size:0.8rem;font-weight:600;color:var(--ink-2);white-space:nowrap;}.tabs-filter:hover{border-color:var(--ink);}

/* CATEGORIES */
.cats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;}
@media(max-width:900px){.cats-grid{grid-template-columns:repeat(2,1fr);}}
@media(max-width:480px){.cats-grid{grid-template-columns:repeat(2,1fr);}}
.cat-tile{display:flex;flex-direction:column;background:var(--bg-2);border:1px solid var(--line);border-radius:var(--radius-md);overflow:hidden;transition:all .18s;cursor:pointer;}
.cat-tile:hover{border-color:var(--ink);transform:translateY(-2px);box-shadow:var(--shadow-md);}
.cat-tile:hover .cat-tile-icon{color:var(--bg);background:var(--brand);}
.cat-tile-media{position:relative;aspect-ratio:16/9;overflow:hidden;background:var(--bg-3);}
.cat-tile-stripes{position:absolute;inset:0;background:repeating-linear-gradient(calc(28deg + var(--i,0)*15deg),transparent 0 12px,rgba(0,0,0,0.025) 12px 13px);}
.cat-tile-icon{position:absolute;inset-inline-start:14px;bottom:14px;width:52px;height:52px;display:grid;place-items:center;color:var(--brand);background:var(--bg);border-radius:8px;border:1px solid var(--line);transition:all .18s;z-index:1;}
.cat-tile-body{padding:12px 14px;display:flex;flex-direction:column;gap:6px;border-top:1px solid var(--line);}
.cat-tile-title b{display:block;font-size:0.95rem;}
.cat-tile-title small{display:block;font-family:var(--f-mono);font-size:0.68rem;color:var(--ink-3);letter-spacing:0.06em;margin-top:2px;}
.cat-tile-foot{display:flex;justify-content:space-between;align-items:center;color:var(--ink-3);font-size:0.8rem;padding-top:6px;border-top:1px dashed var(--line);}

/* PRODUCT CARD */
.card{background:var(--bg);border:1px solid var(--line);border-radius:var(--radius-md);overflow:hidden;display:flex;flex-direction:column;transition:all .15s;cursor:pointer;}
.card:hover{border-color:var(--ink-3);box-shadow:var(--shadow-md);}
.card-media{position:relative;width:100%;height:200px;overflow:hidden;background:var(--bg-2);flex-shrink:0;}
.card-media img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;padding:10px;transition:transform .3s;}
.card:hover .card-media img{transform:scale(1.04);}
.badge{position:absolute;top:8px;inset-inline-start:8px;background:var(--brand);color:#fff;font-size:0.68rem;font-weight:800;padding:3px 8px;border-radius:var(--radius);font-family:var(--f-mono);z-index:1;}
.badge-offer{background:var(--red);}
.wish{position:absolute;top:8px;inset-inline-end:8px;width:30px;height:30px;border-radius:50%;background:rgba(255,255,255,0.9);display:grid;place-items:center;color:var(--ink-2);border:1px solid var(--line);z-index:1;transition:all .15s;}
.wish:hover{color:var(--brand);border-color:var(--brand);}
.wish.wished{color:#e53e3e;border-color:#e53e3e;background:#fff0f0;}
.card-body{padding:12px 14px;display:flex;flex-direction:column;gap:7px;flex:1;}
.card-sku{display:flex;justify-content:space-between;align-items:center;font-size:0.72rem;}
.sku-mono{font-family:var(--f-mono);color:var(--ink-3);letter-spacing:0.04em;}
.card-name{margin:0;font-size:0.92rem;font-weight:700;line-height:1.4;min-height:2.6em;}
.card-price-row{display:flex;justify-content:space-between;align-items:center;gap:6px;flex-wrap:wrap;}
.card-price{display:inline-flex;align-items:baseline;gap:6px;}
.card-price .cur{font-size:0.72rem;color:var(--ink-3);font-weight:600;}.card-price .amt{font-size:1.2rem;font-weight:900;font-family:var(--f-mono);}.card-price .retail{text-decoration:line-through;color:var(--ink-3);font-size:0.78rem;}
.card-price .offer-price{color:var(--red);font-size:1.2rem;font-weight:900;font-family:var(--f-mono);}
.card-foot{display:flex;justify-content:space-between;align-items:center;border-top:1px dashed var(--line);padding-top:8px;margin-top:auto;}
.card-stock{font-size:0.75rem;color:var(--ink-3);display:inline-flex;align-items:center;gap:5px;}
.dot-green{width:6px;height:6px;background:var(--green);border-radius:50%;display:inline-block;flex-shrink:0;}
.add{display:inline-flex;align-items:center;gap:5px;padding:7px 11px;background:var(--ink);color:var(--bg);border-radius:var(--radius);font-size:0.78rem;font-weight:700;transition:all .15s;border:0;white-space:nowrap;}.add:hover{background:var(--brand);color:#fff;}
.add:disabled{opacity:.4;cursor:not-allowed;}

/* PLACEHOLDER */
.pp{position:relative;width:100%;height:200px;min-height:200px;overflow:hidden;}
.pp-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(0,0,0,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,0.04) 1px,transparent 1px);background-size:24px 24px;}
.pp-label{position:absolute;inset-inline-start:10px;bottom:10px;background:var(--ink);color:var(--bg);padding:5px 8px;border-radius:var(--radius);font-family:var(--f-mono);font-size:0.66rem;max-width:80%;}
.pp-sku{display:block;color:var(--brand);letter-spacing:0.04em;font-size:0.58rem;}
.pp-name{display:block;font-weight:600;letter-spacing:0;margin-top:2px;font-family:var(--f-ar);font-size:0.78rem;}
.pp-corner{position:absolute;width:12px;height:12px;border-color:var(--ink);border-style:solid;border-width:0;opacity:0.35;}
.pp-corner.tl{top:5px;inset-inline-start:5px;border-top-width:2px;border-inline-start-width:2px;}
.pp-corner.tr{top:5px;inset-inline-end:5px;border-top-width:2px;border-inline-end-width:2px;}
.pp-corner.bl{bottom:5px;inset-inline-start:5px;border-bottom-width:2px;border-inline-start-width:2px;}
.pp-corner.br{bottom:5px;inset-inline-end:5px;border-bottom-width:2px;border-inline-end-width:2px;}

/* SITE IMAGE */
.site-img{position:relative;width:100%;height:100%;}
.site-img img{width:100%;height:100%;object-fit:cover;}
.site-img-edit{position:absolute;inset:0;background:rgba(0,0,0,.55);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;opacity:0;transition:opacity .2s;cursor:pointer;}
.site-img:hover .site-img-edit{opacity:1;}
.site-img-edit span{color:#fff;font-size:0.78rem;font-weight:700;}

/* BANNERS */
.banners-wrap{max-width:var(--wrap);margin:0 auto;padding:0 16px;}
.banners{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;}
@media(max-width:768px){.banners{grid-template-columns:1fr;}}
.bnr{position:relative;border-radius:var(--radius-md);overflow:hidden;display:flex;flex-direction:column;justify-content:flex-start;min-height:180px;transition:transform .2s;cursor:pointer;}.bnr:hover{transform:translateY(-2px);}
.bnr-inner{position:relative;z-index:1;padding:28px 22px;display:flex;flex-direction:column;height:100%;}
.bnr-bg{position:absolute;inset:0;background-size:cover;background-position:center;}
.bnr-1{background:var(--ink);color:var(--bg);}
.bnr-2{background:var(--brand);color:#fff;}
.bnr-3{background:var(--bg-3);color:var(--ink);border:1px solid var(--line);}
.bnr h3{margin:10px 0;font-size:1.4rem;line-height:1.15;}
.bnr p{margin:0 0 12px;font-size:0.9rem;opacity:0.8;}
.bnr-tag{font-family:var(--f-mono);font-size:0.72rem;letter-spacing:0.08em;text-transform:uppercase;font-weight:700;}
.bnr-1 .bnr-tag{color:var(--brand);}.bnr-2 .bnr-tag{color:rgba(255,255,255,.7);}.bnr-3 .bnr-tag{color:var(--brand);}
.bnr-cta{display:inline-flex;align-items:center;gap:5px;font-weight:700;margin-top:auto;font-size:0.9rem;}
.bnr-1 .bnr-cta{color:var(--brand);}.bnr-2 .bnr-cta{color:#fff;}.bnr-3 .bnr-cta{color:var(--brand);}
.bnr-stripes{position:absolute;inset:0;background:repeating-linear-gradient(135deg,transparent 0 18px,rgba(255,255,255,0.05) 18px 19px);pointer-events:none;z-index:0;}

/* CAT RAIL */
.cat-rail{background:var(--bg-2);border-top:1px solid var(--line);border-bottom:1px solid var(--line);}
.rail-hero{display:grid;grid-template-columns:1fr 2.5fr;gap:20px;align-items:stretch;}
@media(max-width:900px){.rail-hero{grid-template-columns:1fr;}}
.rail-hero-text{background:var(--ink);color:var(--bg);padding:28px;border-radius:var(--radius-md);display:flex;flex-direction:column;justify-content:center;position:relative;overflow:hidden;}
.rail-hero-text::before{content:"";position:absolute;top:0;inset-inline-start:0;width:5px;height:100%;background:var(--brand);}
.rail-hero-text .sec-title{margin:6px 0 10px;font-size:1.4rem;color:var(--bg);}
.rail-hero-text .sec-eyebrow{color:rgba(255,255,255,.5);}
.rail-desc{color:rgba(255,255,255,.6);font-size:0.88rem;line-height:1.6;margin:0 0 16px;}
.rail-stat{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:20px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.1);}
.rail-stat b{display:block;font-size:1.2rem;font-weight:900;color:var(--brand);font-family:var(--f-mono);}
.rail-stat small{display:block;font-size:0.68rem;color:rgba(255,255,255,.4);margin-top:2px;}

/* BRANDS */
.brands-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:0;border:1px solid var(--line);border-radius:var(--radius-md);overflow:hidden;background:var(--bg);}
@media(min-width:768px){.brands-grid{grid-template-columns:repeat(8,1fr);}}
.brand-tile{position:relative;padding:24px 10px;display:grid;place-items:center;border-inline-end:1px solid var(--line);border-bottom:1px solid var(--line);transition:background .15s;}
.brand-tile:hover{background:var(--bg-2);}
.brand-logo{font-family:var(--f-mono);font-weight:900;font-size:1.1rem;letter-spacing:0.04em;color:var(--ink-2);}.brand-tile:hover .brand-logo{color:var(--brand);}
.brand-tag{position:absolute;top:6px;inset-inline-start:6px;background:var(--brand);color:#fff;padding:2px 5px;border-radius:2px;font-size:0.58rem;font-family:var(--f-mono);font-weight:700;}

/* REVIEWS */
.reviews-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:24px;}
@media(max-width:900px){.reviews-grid{grid-template-columns:1fr;}}
.review{background:var(--bg);border:1px solid var(--line);padding:20px;border-radius:var(--radius-md);display:flex;flex-direction:column;gap:12px;}
.review-head{display:flex;justify-content:space-between;align-items:center;}
.review-verified{font-size:0.72rem;color:var(--green);display:inline-flex;align-items:center;gap:4px;font-weight:700;}
.review-text{font-size:0.92rem;line-height:1.65;color:var(--ink-2);margin:0;flex:1;}
.review-foot{display:flex;align-items:center;gap:10px;padding-top:10px;border-top:1px solid var(--line);}
.review-avatar{width:36px;height:36px;border-radius:50%;background:var(--brand-soft);color:var(--brand-ink);display:grid;place-items:center;font-weight:800;flex-shrink:0;}
.review-foot b{display:block;font-size:0.85rem;}
.review-foot small{display:block;font-size:0.72rem;color:var(--ink-3);}
.reviews-strip{display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:center;padding:20px 24px;background:var(--ink);color:var(--bg);border-radius:var(--radius-md);}
@media(min-width:768px){.reviews-strip{grid-template-columns:1fr auto 1fr auto 1fr auto 1fr;}}
.reviews-strip b{display:block;font-size:1.4rem;font-weight:900;font-family:var(--f-mono);color:var(--brand);}
.reviews-strip small{display:block;font-size:0.78rem;color:rgba(255,255,255,.4);margin-top:4px;}
.reviews-strip .vr{width:1px;height:36px;background:rgba(255,255,255,0.15);display:none;}
@media(min-width:768px){.reviews-strip .vr{display:block;}}

/* FOOTER */
.site-footer{background:#1a1714;color:rgba(255,255,255,.6);margin-top:40px;}
.foot-top{display:grid;grid-template-columns:1fr 1fr;gap:24px;padding:40px 16px;}
@media(min-width:768px){.foot-top{grid-template-columns:1.5fr 1fr 1fr 1fr 1.4fr;gap:28px;padding:48px 24px;}}
.foot-brand p{font-size:0.88rem;line-height:1.7;margin:12px 0;}
.foot-logo{width:60px;height:60px;border-radius:8px;overflow:hidden;background:#fff;}
.foot-logo img{width:100%;height:100%;object-fit:contain;}
.foot-contact{display:flex;gap:14px;font-size:0.78rem;flex-wrap:wrap;}
.foot-contact span{display:inline-flex;align-items:center;gap:5px;}
.foot-col h5{margin:0 0 12px;font-size:0.82rem;font-weight:800;color:rgba(255,255,255,.9);letter-spacing:0.02em;}
.foot-col ul{list-style:none;padding:0;margin:0;}.foot-col li{padding:4px 0;font-size:0.85rem;cursor:pointer;}.foot-col li:hover{color:var(--brand);}
.foot-news .news-row{display:flex;border:1px solid rgba(255,255,255,0.15);border-radius:var(--radius);overflow:hidden;margin-bottom:8px;background:rgba(255,255,255,0.04);}
.foot-news input{flex:1;background:transparent;border:0;padding:9px 12px;color:rgba(255,255,255,.9);font-size:0.88rem;outline:none;}
.foot-news input::placeholder{color:rgba(255,255,255,.4);}
.foot-news button{background:var(--brand);color:#fff;padding:0 14px;border:0;}
.foot-news small{font-size:0.75rem;opacity:0.7;display:block;margin-bottom:10px;}
.pay{display:flex;flex-wrap:wrap;gap:5px;margin-top:10px;}
.pay span{font-family:var(--f-mono);font-size:0.65rem;padding:3px 7px;background:rgba(255,255,255,0.06);border-radius:2px;}
.foot-bot{border-top:1px solid rgba(255,255,255,0.08);padding:14px 0;}
.foot-bot-inner{display:flex;justify-content:space-between;font-size:0.78rem;flex-wrap:wrap;gap:8px;}
.foot-links span{margin:0 6px;cursor:pointer;}.foot-links span:hover{color:var(--brand);}

/* DRAWER */
.drawer-scrim{position:fixed;inset:0;background:rgba(0,0,0,0.4);opacity:0;pointer-events:none;transition:opacity .2s;z-index:80;}.drawer-scrim.on{opacity:1;pointer-events:auto;}
.drawer{position:fixed;top:0;right:0;width:min(420px,100vw);height:100vh;background:var(--bg);z-index:81;display:flex;flex-direction:column;transform:translateX(105%);transition:transform .28s cubic-bezier(.4,0,.2,1);box-shadow:-4px 0 24px rgba(0,0,0,.12);}.drawer.on{transform:translateX(0);}
.drawer-head{display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid var(--line);}
.drawer-head b{display:block;font-size:1.05rem;}.drawer-head small{color:var(--ink-3);font-size:0.78rem;}
.drawer-body{flex:1;overflow-y:auto;padding:14px 16px;display:flex;flex-direction:column;gap:12px;}
.drawer-item{display:grid;grid-template-columns:72px 1fr;gap:12px;padding:12px;border:1px solid var(--line);border-radius:var(--radius);}
.drawer-media{width:72px;height:72px;border-radius:var(--radius);overflow:hidden;}
.drawer-media img{width:100%;height:100%;object-fit:cover;}
.drawer-meta{display:flex;flex-direction:column;gap:4px;}
.drawer-sku{font-family:var(--f-mono);font-size:0.66rem;color:var(--ink-3);}
.drawer-name{font-size:0.88rem;font-weight:700;line-height:1.3;}
.drawer-price{display:flex;align-items:baseline;gap:6px;}
.drawer-price .amt{font-weight:800;font-family:var(--f-mono);font-size:0.95rem;}
.drawer-actions{display:flex;justify-content:space-between;align-items:center;margin-top:2px;}
.qty{display:inline-flex;align-items:center;border:1px solid var(--line);border-radius:var(--radius);overflow:hidden;}
.qty button{width:26px;height:26px;display:grid;place-items:center;background:var(--bg-2);color:var(--ink-2);border:0;}.qty button:hover{background:var(--bg-3);}
.qty span{padding:0 10px;font-weight:700;font-family:var(--f-mono);font-size:0.85rem;}
.drawer-del{display:inline-flex;align-items:center;gap:3px;font-size:0.75rem;color:var(--ink-3);border:0;background:none;cursor:pointer;}.drawer-del:hover{color:var(--red);}
.drawer-foot{border-top:1px solid var(--line);padding:16px 20px;display:flex;flex-direction:column;gap:7px;background:var(--bg-2);}
.drawer-row{display:flex;justify-content:space-between;font-size:0.9rem;}.drawer-row b{font-weight:800;}
.drawer-row.total{font-size:1.05rem;padding-top:8px;border-top:1px solid var(--line);margin-top:4px;}.drawer-row.total b{font-size:1.25rem;font-family:var(--f-mono);}
.drawer-note{font-size:0.72rem;color:var(--ink-3);display:inline-flex;align-items:center;gap:4px;margin-top:4px;justify-content:center;}
.drawer-empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:32px;text-align:center;}
.empty-icon{width:72px;height:72px;border-radius:50%;background:var(--bg-2);display:grid;place-items:center;color:var(--ink-3);}
.drawer-empty b{font-size:1.05rem;}.drawer-empty p{color:var(--ink-3);margin:0 0 8px;}

/* PRODUCT DETAIL */
.product-detail{max-width:1200px;margin:0 auto;padding:32px 16px;}
.product-grid{display:grid;grid-template-columns:1fr 1fr;gap:36px;margin-bottom:40px;}
@media(max-width:768px){.product-grid{grid-template-columns:1fr;}}
.gallery-main{border:1px solid var(--line);border-radius:var(--radius-md);overflow:hidden;aspect-ratio:4/3;background:var(--bg-2);}
.gallery-main img{width:100%;height:100%;object-fit:contain;padding:16px;}
.gallery-thumbs{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;}
.gallery-thumb{width:64px;height:64px;border:2px solid var(--line);border-radius:var(--radius);overflow:hidden;cursor:pointer;background:var(--bg-2);}.gallery-thumb.on{border-color:var(--brand);}
.gallery-thumb img{width:100%;height:100%;object-fit:cover;}
.qty-row{display:flex;align-items:center;gap:14px;}
.qty-ctrl{display:inline-flex;align-items:center;border:2px solid var(--line);border-radius:var(--radius);overflow:hidden;}
.qty-ctrl button{width:40px;height:40px;display:grid;place-items:center;background:var(--bg-2);font-size:18px;border:0;}.qty-ctrl button:hover{background:var(--bg-3);}
.qty-ctrl span{min-width:44px;text-align:center;font-weight:800;font-size:1.05rem;}

/* CHECKOUT */
.checkout-wrap{max-width:960px;margin:0 auto;padding:36px 16px;}
.checkout-grid{display:grid;grid-template-columns:1fr 340px;gap:28px;align-items:start;}
@media(max-width:900px){.checkout-grid{grid-template-columns:1fr;}}
.checkout-section{background:var(--bg);border:1px solid var(--line);border-radius:var(--radius-md);padding:22px;margin-bottom:16px;}
.checkout-section h3{margin:0 0 18px;font-size:1.05rem;font-weight:800;display:flex;align-items:center;gap:8px;}
.step-num{width:26px;height:26px;border-radius:50%;background:var(--brand);color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:0.78rem;font-weight:800;flex-shrink:0;}
.form-row{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
@media(max-width:600px){.form-row{grid-template-columns:1fr;}}
.form-group{display:flex;flex-direction:column;gap:5px;margin-bottom:14px;}
.form-group label{font-size:0.82rem;font-weight:700;}
.form-input{padding:10px 12px;border:1.5px solid var(--line);border-radius:var(--radius);font-family:var(--f-ar);font-size:0.92rem;color:var(--ink);background:var(--bg);outline:none;transition:border-color .15s;width:100%;}.form-input:focus{border-color:var(--brand);}.form-input.err{border-color:var(--red);}
.form-err{font-size:0.73rem;color:var(--red);}
.payment-option{display:flex;align-items:center;gap:12px;padding:14px;border:1.5px solid var(--brand);border-radius:var(--radius);background:var(--brand-soft);}
.order-summary{background:var(--bg);border:1px solid var(--line);border-radius:var(--radius-md);padding:20px;position:sticky;top:120px;}
.order-summary h3{margin:0 0 16px;font-size:1rem;font-weight:800;}
.summary-items{max-height:240px;overflow-y:auto;margin-bottom:16px;display:flex;flex-direction:column;gap:12px;}
.summary-item{display:flex;gap:10px;align-items:center;}
.summary-item-img{width:48px;height:48px;border-radius:var(--radius);overflow:hidden;flex-shrink:0;background:var(--bg-2);}
.summary-item-img img{width:100%;height:100%;object-fit:cover;}
.summary-item-name{font-size:0.84rem;font-weight:600;flex:1;line-height:1.3;}
.summary-item-qty{font-size:0.75rem;color:var(--ink-3);}
.summary-item-price{font-weight:800;font-family:var(--f-mono);font-size:0.88rem;white-space:nowrap;}
.summary-divider{height:1px;background:var(--line);margin:10px 0;}
.summary-row{display:flex;justify-content:space-between;font-size:0.88rem;margin-bottom:7px;}.summary-row b{font-weight:700;}
.summary-total{display:flex;justify-content:space-between;font-size:1.05rem;padding-top:10px;border-top:2px solid var(--line);margin-top:4px;}.summary-total b{font-weight:900;}.summary-total .amt{font-size:1.3rem;font-weight:900;font-family:var(--f-mono);color:var(--brand);}

/* CONFIRMATION */
.confirm-wrap{max-width:560px;margin:48px auto;padding:0 16px;text-align:center;}
.confirm-card{background:var(--bg);border:1px solid var(--line);border-radius:var(--radius-md);padding:40px 28px;box-shadow:var(--shadow-md);}
.confirm-icon{width:68px;height:68px;border-radius:50%;background:color-mix(in oklch,var(--green),white 80%);display:flex;align-items:center;justify-content:center;margin:0 auto 20px;color:var(--green);}
.confirm-code{font-family:var(--f-mono);font-size:1.5rem;font-weight:900;color:var(--brand);letter-spacing:0.1em;margin:6px 0 20px;}
.confirm-meta{background:var(--bg-2);border-radius:var(--radius);padding:16px;margin-bottom:24px;text-align:right;}
.confirm-meta-row{display:flex;justify-content:space-between;font-size:0.88rem;padding:5px 0;border-bottom:1px solid var(--line);}.confirm-meta-row:last-child{border-bottom:0;}.confirm-meta-row b{font-weight:700;}

/* COMING SOON */
.cs-wrap{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 20px;text-align:center;position:relative;overflow:hidden;background:var(--ink);}
.cs-bg{position:absolute;inset:0;background:repeating-linear-gradient(135deg,transparent 0 40px,rgba(255,255,255,.015) 40px 41px);}
.cs-rule{position:absolute;top:0;left:0;right:0;height:5px;background:var(--brand);}
.cs-logo{width:80px;height:80px;border-radius:12px;overflow:hidden;background:#fff;margin:0 auto 28px;}
.cs-logo img{width:100%;height:100%;object-fit:contain;}
.cs-title{font-size:clamp(1.8rem,6vw,3.8rem);font-weight:900;color:#fff;line-height:1.1;margin:0 0 14px;}
.cs-title span{color:var(--brand);}
.cs-sub{font-size:1rem;color:rgba(255,255,255,.6);max-width:440px;margin:0 auto 36px;line-height:1.6;}
.cs-form{display:flex;gap:0;border-radius:var(--radius);overflow:hidden;max-width:400px;width:100%;margin:0 auto 40px;border:1.5px solid rgba(255,255,255,.15);}
.cs-form input{flex:1;background:rgba(255,255,255,.06);border:0;padding:13px 16px;color:#fff;font-family:var(--f-ar);font-size:0.9rem;outline:none;min-width:0;}
.cs-form input::placeholder{color:rgba(255,255,255,.4);}
.cs-form button{background:var(--brand);color:#fff;padding:13px 20px;font-family:var(--f-ar);font-weight:700;font-size:0.9rem;border:0;white-space:nowrap;cursor:pointer;}.cs-form button:hover{background:var(--brand-ink);}
.cs-trust{display:flex;gap:24px;justify-content:center;flex-wrap:wrap;}
.cs-trust-item{display:flex;align-items:center;gap:7px;color:rgba(255,255,255,.55);font-size:0.85rem;}
.cs-bg-img{position:absolute;inset:0;background-size:cover;background-position:center;opacity:.12;}

/* INFO PAGES */
.info-page{max-width:800px;margin:0 auto;padding:40px 16px;}
.info-page h1{font-size:1.8rem;font-weight:900;margin:0 0 8px;}
.info-page .info-sub{color:var(--ink-3);font-size:0.88rem;margin-bottom:32px;padding-bottom:20px;border-bottom:1px solid var(--line);}
.info-section{margin-bottom:32px;}
.info-section h2{font-size:1.1rem;font-weight:800;margin:0 0 12px;color:var(--brand);}
.info-section p,.info-section li{font-size:0.95rem;line-height:1.8;color:var(--ink-2);}
.info-section ul{padding-inline-start:20px;margin:8px 0;}
.info-section li{margin-bottom:6px;}
.info-highlight{background:var(--brand-soft);border-right:3px solid var(--brand);padding:14px 18px;border-radius:var(--radius);margin-bottom:16px;font-size:0.92rem;color:var(--ink-2);}

/* ORDERS PAGE */
.orders-page{max-width:800px;margin:0 auto;padding:40px 16px;}
.order-card{background:var(--bg);border:1px solid var(--line);border-radius:var(--radius-md);padding:20px;margin-bottom:14px;}
.order-card-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px;}
.order-code{font-family:var(--f-mono);font-weight:800;font-size:0.95rem;color:var(--brand);}
.order-status{padding:4px 12px;border-radius:999px;font-size:0.78rem;font-weight:700;}
.order-items-list{display:flex;flex-direction:column;gap:8px;padding-top:12px;border-top:1px solid var(--line);}
.order-item-row{display:flex;gap:10px;align-items:center;font-size:0.88rem;}
.order-item-img{width:44px;height:44px;border-radius:var(--radius);overflow:hidden;background:var(--bg-2);flex-shrink:0;}
.order-item-img img{width:100%;height:100%;object-fit:cover;}
.order-footer{display:flex;justify-content:space-between;align-items:center;margin-top:12px;padding-top:12px;border-top:1px dashed var(--line);}

/* TOAST */
.toast{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);padding:11px 24px;border-radius:10px;font-weight:600;font-size:14px;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,.2);direction:rtl;white-space:nowrap;pointer-events:none;}

/* ADMIN BAR */
.admin-bar{position:fixed;bottom:0;left:0;right:0;background:var(--ink);color:var(--bg);z-index:90;padding:8px 16px;display:flex;align-items:center;gap:12px;font-family:var(--f-mono);font-size:0.78rem;border-top:3px solid var(--brand);flex-wrap:wrap;}

/* SHOP PAGE */
.shop-layout{max-width:var(--wrap);margin:0 auto;padding:32px 16px;}
.shop-grid{display:grid;grid-template-columns:220px 1fr;gap:28px;align-items:start;}
@media(max-width:768px){.shop-grid{grid-template-columns:1fr;}}
.shop-sidebar{position:sticky;top:100px;}
@media(max-width:768px){.shop-sidebar{position:static;}}
.sidebar-box{background:var(--bg);border:1px solid var(--line);border-radius:var(--radius-md);padding:18px;margin-bottom:14px;}
.sidebar-box h4{margin:0 0 12px;font-size:0.85rem;font-weight:800;}
.sidebar-cat-btn{display:block;width:100%;text-align:right;padding:7px 10px;background:none;border:none;border-radius:var(--radius);font-family:var(--f-ar);font-size:0.85rem;cursor:pointer;color:var(--ink-2);font-weight:400;margin-bottom:2px;transition:all .15s;}
.sidebar-cat-btn.on{background:var(--brand-soft);color:var(--brand-ink);font-weight:700;border-right:3px solid var(--brand);}
.sidebar-cat-btn:hover:not(.on){background:var(--bg-2);}
.cat-carousel{display:flex;gap:14px;overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:8px;-webkit-overflow-scrolling:touch;align-items:flex-start;}
.cat-carousel::-webkit-scrollbar{height:4px;}
.cat-carousel::-webkit-scrollbar-track{background:var(--bg-3);border-radius:99px;}
.cat-carousel::-webkit-scrollbar-thumb{background:var(--brand);border-radius:99px;}
.cat-carousel .card{min-width:160px;max-width:220px;scroll-snap-align:start;flex-shrink:0;}
@media(min-width:768px){.cat-carousel .card{min-width:260px;max-width:260px;}}
@media(max-width:768px){
  .mega{position:fixed;top:auto;left:0;right:0;width:100vw;max-height:80vh;overflow-y:auto;border-radius:0 0 16px 16px;box-shadow:0 12px 40px rgba(0,0,0,0.18);z-index:9999;}
  .mega-inner{grid-template-columns:1fr;}
  .mega-cats{border-inline-end:none;border-bottom:1px solid var(--line);}
}
`;

/* ─── Icons ──────────────────────────────────────────────────────────────── */
const Icon = ({ name, size = 20, stroke = 1.75 }) => {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: stroke, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (name) {
    case "search":   return <svg {...p}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>;
    case "cart":     return <svg {...p}><path d="M3 4h2.5l2.3 11.3a2 2 0 0 0 2 1.7h7.6a2 2 0 0 0 2-1.5L21 8H6"/><circle cx="10" cy="20" r="1.2"/><circle cx="18" cy="20" r="1.2"/></svg>;
    case "user":     return <svg {...p}><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/></svg>;
    case "heart":    return <svg {...p}><path d="M20.8 5.6a5 5 0 0 0-8.8 2.2A5 5 0 0 0 3.2 5.6c-2 2.5-.5 5.6 1 7.2L12 20l7.8-7.2c1.5-1.6 3-4.7 1-7.2z"/></svg>;
    case "phone":    return <svg {...p}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L7.9 9.8a16 16 0 0 0 6 6l1.4-1.3a2 2 0 0 1 2.1-.5c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2z"/></svg>;
    case "truck":    return <svg {...p}><path d="M1 3h15v13H1z"/><path d="M16 8h4l3 3v5h-7"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>;
    case "shield":   return <svg {...p}><path d="M12 2 4 5v6c0 5 3.5 9.3 8 11 4.5-1.7 8-6 8-11V5z"/><path d="m9 12 2 2 4-4"/></svg>;
    case "tag":      return <svg {...p}><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.2"/></svg>;
    case "chat":     return <svg {...p}><path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
    case "menu":     return <svg {...p}><path d="M3 6h18M3 12h18M3 18h18"/></svg>;
    case "close":    return <svg {...p}><path d="M18 6 6 18M6 6l12 12"/></svg>;
    case "chev":     return <svg {...p}><path d="m9 6 6 6-6 6"/></svg>;
    case "chevdown": return <svg {...p}><path d="m6 9 6 6 6-6"/></svg>;
    case "plus":     return <svg {...p}><path d="M12 5v14M5 12h14"/></svg>;
    case "minus":    return <svg {...p}><path d="M5 12h14"/></svg>;
    case "star":     return <svg {...p} fill="currentColor" stroke="none"><path d="M12 2 15 9l7 .6-5.3 4.7L18.2 22 12 18 5.8 22l1.5-7.7L2 9.6 9 9z"/></svg>;
    case "check":    return <svg {...p}><path d="m5 12 4 4L19 6"/></svg>;
    case "pin":      return <svg {...p}><path d="M12 22s8-8.1 8-13a8 8 0 0 0-16 0c0 4.9 8 13 8 13z"/><circle cx="12" cy="9" r="3"/></svg>;
    case "sun":      return <svg {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>;
    case "moon":     return <svg {...p}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>;
    case "image":    return <svg {...p}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>;
    case "upload":   return <svg {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>;
    case "trash":    return <svg {...p}><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14"/></svg>;
    case "arrow":    return <svg {...p}><path d="M5 12h14M13 5l7 7-7 7"/></svg>;
    case "back":     return <svg {...p}><path d="M19 12H5M12 19l-7-7 7-7"/></svg>;
    case "bolt":     return <svg {...p}><path d="M13 2 3 14h7l-1 8 10-12h-7z"/></svg>;
    case "battery":  return <svg {...p}><rect x="2" y="7" width="16" height="10" rx="2"/><path d="M22 11v2"/><path d="M6 10v4M10 10v4"/></svg>;
    case "wrench":   return <svg {...p}><path d="M14.7 6.3a4 4 0 0 0 5 5l-9 9a2.8 2.8 0 1 1-4-4z"/></svg>;
    case "ruler":    return <svg {...p}><path d="M2 14 14 2l8 8L10 22z"/><path d="m6 10 2 2M9 7l2 2M12 4l2 2M3 13l2 2"/></svg>;
    case "leaf":     return <svg {...p}><path d="M11 20A7 7 0 0 1 4 13c0-5 5-11 11-11h5v5c0 6-6 11-9 13z"/><path d="M2 22 11 13"/></svg>;
    case "car":      return <svg {...p}><path d="M5 17h14M6 11l2-5h8l2 5M5 17v3h3v-3M16 17v3h3v-3M3 17h18v-4a2 2 0 0 0-1-1.7L18 11H6l-2 .3A2 2 0 0 0 3 13z"/></svg>;
    case "case":     return <svg {...p}><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18"/></svg>;
    case "helmet":   return <svg {...p}><path d="M4 17a8 8 0 0 1 16 0v2H4z"/><path d="M9 9V5h6v4M2 19h20"/></svg>;
    case "filter":   return <svg {...p}><path d="M3 5h18l-7 9v6l-4-2v-4z"/></svg>;
    case "whatsapp": return <svg {...p} fill="currentColor" stroke="none" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>;
    default: return null;
  }
};

const Stars = ({ rating = 0, size = 12 }) => (
  <span style={{ display: "inline-flex", gap: 1, color: "var(--brand)" }}>
    {[1,2,3,4,5].map(i => <span key={i} style={{ opacity: i <= Math.round(rating) ? 1 : 0.25 }}><Icon name="star" size={size} /></span>)}
  </span>
);

/* ─── Placeholder ────────────────────────────────────────────────────────── */
const PP = ({ stripe = 0, label, sku }) => {
  const hues = [28, 210, 45, 0, 180, 250];
  const hue = hues[stripe % hues.length];
  const bg1 = `oklch(0.94 0.01 ${hue})`, bg2 = `oklch(0.88 0.015 ${hue})`;
  const angle = 20 + (stripe * 13) % 60;
  return (
    <div className="pp" style={{ background: `repeating-linear-gradient(${angle}deg,${bg1} 0 14px,${bg2} 14px 28px)` }}>
      <div className="pp-grid" />
      {label && <div className="pp-label"><span className="pp-sku">{sku}</span><span className="pp-name">{label}</span></div>}
      {["tl","tr","bl","br"].map(c => <div key={c} className={`pp-corner ${c}`} />)}
    </div>
  );
};

/* ─── SiteImageSlot ──────────────────────────────────────────────────────── */
const SiteImageSlot = ({ src, folder, fallback, onUpdate, showToast, style = {} }) => {
  const fileRef = useRef();
  const [uploading, setUploading] = useState(false);
  const handleFile = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await sbUpload("protech-media", `${folder}/${uid()}-${file.name.replace(/\s/g,"_")}`, file);
      onUpdate(url); showToast?.("تم تحديث الصورة ✓");
    } catch { showToast?.("فشل الرفع", "error"); }
    setUploading(false);
  };
  return (
    <div className="site-img" style={{ ...style, width:"100%", height:"100%" }}>
      {src ? <img src={src} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} /> : fallback}
      <div className="site-img-edit" onClick={() => fileRef.current?.click()}>
        <Icon name={uploading ? "upload" : "image"} size={26} />
        <span>{uploading ? "جاري الرفع…" : "استبدل الصورة"}</span>
      </div>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => handleFile(e.target.files[0])} />
    </div>
  );
};

/* ─── Product Card ───────────────────────────────────────────────────────── */
const ProductCard = ({ p, onAdd, onNavigate, onWish, isWished }) => {
  const imgs = Array.isArray(p.images) ? p.images : [];
  const thumb = imgs[0] || null;
  const hasOffer = p.is_offer && p.offer_price && p.offer_price < p.price;
  const discount = hasOffer
    ? Math.round((1 - p.offer_price / p.price) * 100)
    : (p.old_price > p.price ? Math.round((1 - p.price / p.old_price) * 100) : 0);
  const displayPrice = hasOffer ? p.offer_price : p.price;
  const originalPrice = hasOffer ? p.price : p.old_price;
  const displayBadge = p.badge || (hasOffer ? `خصم ${discount}٪` : null);

  return (
    <article className="card" onClick={() => onNavigate?.("product", { product: p })}>
      <div className="card-media">
        {thumb ? <img src={optimizeImg(thumb, 400)} alt={p.name} loading="lazy" /> : <PP stripe={(p.id||0) % 6} label={p.name} sku={p.code} />}
        {displayBadge && <span className={`badge ${hasOffer ? "badge-offer" : ""}`}>{displayBadge}</span>}
        <button
          className={`wish${isWished ? " wished" : ""}`}
          aria-label="حفظ"
          onClick={e => { e.stopPropagation(); onWish?.(p); }}>
          <Icon name="heart" size={15} />
        </button>
      </div>
      <div className="card-body">
        <div className="card-sku"><span className="sku-mono">{p.code}</span></div>
        <h3 className="card-name">{p.name}</h3>
        {p.brand && <div style={{ fontSize:"0.72rem", color:"var(--ink-3)", fontFamily:"var(--f-mono)" }}>{p.brand.toUpperCase()}</div>}
        <div className="card-price-row">
          <div className="card-price">
            <span className="cur">ج.م</span>
            <span className={hasOffer ? "offer-price" : "amt"}>{fmtEGP(displayPrice)}</span>
            {originalPrice > displayPrice && <span className="retail">{fmtEGP(originalPrice)}</span>}
          </div>
        </div>
        <div className="card-foot">
          <div className="card-stock">
            {p.qty > 0 ? <><span className="dot-green" />متوفر</> : <span style={{color:"var(--red)"}}>نفذ</span>}
          </div>
          <button className="add" disabled={p.qty <= 0} onClick={e => { e.stopPropagation(); onAdd?.(p); }}>
            <Icon name="plus" size={13} /> أضف للسلة
          </button>
        </div>
      </div>
    </article>
  );
};

/* ─── Header ─────────────────────────────────────────────────────────────── */
const SiteHeader = ({ cartCount, cartTotal, onCart, dark, setDark, navigate, logoSrc, wishCount, onWishlist }) => {
  const [menu, setMenu] = useState(false);
  const [q, setQ] = useState("");
  const submitSearch = () => {
    if (q.trim()) window.fbq?.('track', 'Search', { search_string: q });
    navigate("shop", { search: q });
  };
  return (
    <header className="site-header">
      <div className="topbar">
        <div className="wrap topbar-inner">
          <div className="tb-left">
            <span className="tb-item"><Icon name="truck" size={13} /> شحن مجاني فوق ٥٠٠٠ ج.م</span>
            <span className="tb-sep" />
            <span className="tb-item"><Icon name="pin" size={13} /> التوصيل ٣-٤ أيام لكل المحافظات</span>
            <span className="tb-sep" />
            <span className="tb-item"><Icon name="shield" size={13} /> وكيل رسمي Total و Wadfow</span>
          </div>
          <div className="tb-right">
            <button className="tb-btn" onClick={() => setDark(!dark)}><Icon name={dark?"sun":"moon"} size={13} /></button>
            <span className="tb-sep" />
            <a className="tb-link" href={`https://wa.me/${WHATSAPP_NUMBER}`}><Icon name="phone" size={13} /> ٠١٠٩١٠١١٣٨٠</a>
          </div>
        </div>
      </div>
      <div className="wrap hdr">
        <button className="brand-btn" onClick={() => navigate("home")}>
          <div className="brand-mark">{logoSrc && <img src={logoSrc} alt="Protech" />}</div>
          <div className="brand-text"><b>بروتيك</b><small>الشغل عليك والعدة علينا</small></div>
        </button>
        <div className="search">
          <input className="search-input" placeholder="ابحث عن منتج، ماركة، كود…" value={q} onChange={e => setQ(e.target.value)}
            onKeyDown={e => e.key === "Enter" && submitSearch()} />
          <button className="search-btn" onClick={submitSearch}><Icon name="search" size={17} /></button>
        </div>
        <div className="hdr-right">
          <button className="hdr-pill" onClick={() => navigate("orders")}>
            <Icon name="user" size={18} />
            <span className="hdr-pill-t"><small>تتبع</small><b>طلباتي</b></span>
          </button>
          <button className="hdr-pill" onClick={onWishlist} style={{position:"relative"}}>
            {wishCount > 0 && <span className="hdr-cart-badge" style={{background:"#e53e3e"}}>{wishCount}</span>}
            <Icon name="heart" size={18} />
            <span className="hdr-pill-t"><small>قائمة</small><b>المفضلة</b></span>
          </button>
          <button className="hdr-pill" onClick={onCart}>
            {cartCount > 0 && <span className="hdr-cart-badge">{cartCount}</span>}
            <Icon name="cart" size={18} />
            <span className="hdr-pill-t"><small>السلة</small><b>{fmtEGP(cartTotal)} ج.م</b></span>
          </button>
        </div>
      </div>
      <nav className="navbar">
        <div className="wrap nav-inner">
          <button className="nav-all"
            onMouseEnter={() => setMenu(true)}
            onClick={() => setMenu(m => !m)}>
            <Icon name="menu" size={15}/> كل الأقسام <Icon name="chevdown" size={11}/>
          </button>
          <button className="nav-link hot" onClick={() => navigate("shop", { category:"offers" })} style={{ border:0, background:"none" }}>
            <Icon name="tag" size={13} /> عروض اليوم
          </button>
          <button className="nav-link" onClick={() => navigate("shop", { category:"sets" })} style={{ border:0, background:"none" }}>
            <Icon name="case" size={13} /> اطقم وكومبو
          </button>
          <button className="nav-link" onClick={() => navigate("info","loyalty")} style={{ border:0, background:"none" }}>
            🎁 بطاقة الولاء
          </button>
          <div className="nav-spacer" />
          <a className="nav-link muted" href={`https://wa.me/${WHATSAPP_NUMBER}`}><Icon name="chat" size={13} /> واتساب</a>
        </div>
        {menu && (
          <div className="mega" onMouseLeave={() => setMenu(false)}>
            <div className="wrap mega-inner">
              <div className="mega-cats">
                {CATS.map(c => (
                  <button key={c.id} className="mega-cat" onClick={() => { navigate("shop", { category: c.id }); setMenu(false); }} style={{ width:"100%", border:0, background:"none", cursor:"pointer", textAlign:"right" }}>
                    <span className="mega-cat-icon"><Icon name={c.icon} size={20} /></span>
                    <span className="mega-cat-text"><b>{c.ar}</b><small>{c.en}</small></span>
                    <span className="mega-cat-chev"><Icon name="chev" size={13} /></span>
                  </button>
                ))}
              </div>
              <div style={{padding:"28px 32px",display:"flex",flexDirection:"column",justifyContent:"center",gap:16,maxWidth:400}}>
                <div style={{fontFamily:"var(--f-mono)",fontSize:"0.7rem",color:"var(--brand)",letterSpacing:"0.1em",textTransform:"uppercase",fontWeight:700}}>بطاقة الولاء — LOYALTY CARD</div>
                <h3 style={{margin:0,fontSize:"1.1rem",fontWeight:900,lineHeight:1.4}}>بطاقة ولاء مجانية مع كل طلب 🎁</h3>
                <div className="hero-imgs" style={{display:"flex",flexDirection:"column",gap:10}}>
                  <div style={{display:"flex",alignItems:"flex-start",gap:10,padding:"12px 14px",background:"var(--brand-soft)",borderRadius:"var(--radius)",border:"1px solid var(--brand)"}}>
                    <span style={{fontSize:20,flexShrink:0}}>🏷️</span>
                    <div>
                      <div style={{fontWeight:700,fontSize:"0.88rem",marginBottom:2}}>خصم ١٠٠ ج.م على طلبك التاني</div>
                      <div style={{fontSize:"0.78rem",color:"var(--ink-3)"}}>استخدم البطاقة اللي بتيجي مع طلبك في أي طلب تاني وتوفر ١٠٠ جنيه.</div>
                    </div>
                  </div>
                  <div style={{display:"flex",alignItems:"flex-start",gap:10,padding:"12px 14px",background:"var(--bg-2)",borderRadius:"var(--radius)",border:"1px solid var(--line)"}}>
                    <span style={{fontSize:20,flexShrink:0}}>🎁</span>
                    <div>
                      <div style={{fontWeight:700,fontSize:"0.88rem",marginBottom:2}}>أهدِ صاحبك خصم ١٠٠ ج.م</div>
                      <div style={{fontSize:"0.78rem",color:"var(--ink-3)"}}>البطاقة التانية في الطرد هدية لأي حد تاني — مش لنفسك — يستخدمها في أول طلب له.</div>
                    </div>
                  </div>
                </div>
                <button onClick={()=>{navigate("info","loyalty");setMenu(false);}}
                  style={{alignSelf:"flex-start",background:"var(--brand)",color:"#fff",border:0,borderRadius:"var(--radius)",padding:"8px 16px",fontFamily:"var(--f-ar)",fontWeight:700,fontSize:"0.85rem",cursor:"pointer",display:"inline-flex",alignItems:"center",gap:6}}>
                  اعرف أكثر <Icon name="arrow" size={12}/>
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
};

/* ─── Hero Ticker ────────────────────────────────────────────────────────── */
const HeroTicker = () => (
  <div className="ticker">
    <div className="ticker-track">
      {[0,1].map(i => (
        <div className="ticker-group" key={i}>
          {[
            ["truck","شحن مجاني فوق ٥٠٠٠ ج.م"],
            ["shield","وكيل رسمي Total و Wadfow"],
            ["tag","بطاقة ولاء مجانية مع كل طلب — خصم ١٠٠ ج.م على طلبك التاني"],
            ["chat","استشارة فنية مجانية"],
            ["phone","واتساب ٠١٠٩١٠١١٣٨٠"],
          ].map(([ic,txt],j)=>(
            <><span key={j}><Icon name={ic} size={13}/> {txt}</span><span className="dot">•</span></>
          ))}
        </div>
      ))}
    </div>
  </div>
);

/* ─── Hero ───────────────────────────────────────────────────────────────── */
const HeroA = ({ settings, navigate, onUpdateSettings, showToast, editMode }) => {
  const heroImgs = settings.hero_images?.value || {};
  const updateHeroImg = async (slot, url) => {
    const next = { ...heroImgs, [slot]: url };
    await sb(`site_settings?key=eq.hero_images`, { method:"PATCH", prefer:"return=minimal", body: JSON.stringify({ value: next }) });
    onUpdateSettings("hero_images", next);
  };

  return (
    <section className="hero hero-a">
      <div className="wrap">
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:32,alignItems:"center",padding:"48px 0 32px"}} className="hero-two-col">

          {/* LEFT — Text */}
          <div>
            <div className="eyebrow"><span className="num">01</span> <b>مرحباً بك في بروتيك</b></div>
            <h1 style={{fontSize:"clamp(2.8rem,5vw,4.5rem)",fontWeight:900,lineHeight:1.05,letterSpacing:"-0.02em",margin:"16px 0 20px"}}>
              الشغل عليك<br />
              <span style={{color:"var(--brand)"}}>والعدة علينا.</span>
            </h1>
            <p style={{fontSize:"1rem",color:"var(--ink-2)",margin:"0 0 28px",lineHeight:1.7}}>
              متجرك الإلكتروني لأدوات البناء والصيانة في مصر — الوكيل الرسمي لـ Total و Wadfow، توصيل لكل المحافظات خلال ٣-٤ أيام.
            </p>
            <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:32}}>
              <button className="btn btn-primary" onClick={() => navigate("shop")}>ابدأ التسوق <Icon name="arrow" size={15} /></button>
              <a className="btn btn-ghost" href={`https://wa.me/${WHATSAPP_NUMBER}`}><Icon name="chat" size={13} /> تواصل واتساب</a>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",borderTop:"1px solid var(--line)",paddingTop:20,textAlign:"center"}}>
              <div style={{padding:"8px 0"}}>
                <b style={{display:"block",fontSize:"1.5rem",fontWeight:900,fontFamily:"var(--f-mono)",color:"var(--brand)"}}>١٠٠٪</b>
                <small style={{fontSize:"0.78rem",color:"var(--ink-3)"}}>منتجات أصلية</small>
              </div>
              <div style={{padding:"8px 0",borderRight:"1px solid var(--line)",borderLeft:"1px solid var(--line)"}}>
                <b style={{display:"block",fontSize:"1.5rem",fontWeight:900,fontFamily:"var(--f-mono)",color:"var(--brand)"}}>٣-٤ أيام</b>
                <small style={{fontSize:"0.78rem",color:"var(--ink-3)"}}>توصيل لكل المحافظات</small>
              </div>
              <div style={{padding:"8px 0"}}>
                <b style={{display:"block",fontSize:"1.5rem",fontWeight:900,fontFamily:"var(--f-mono)",color:"var(--brand)"}}>٢٤/٧</b>
                <small style={{fontSize:"0.78rem",color:"var(--ink-3)"}}>دعم على واتساب</small>
              </div>
            </div>
          </div>

          {/* RIGHT — Images */}
          <div style={{display:"flex",flexDirection:"column",gap:10}}>

            {/* Slot 1 — main large */}
            <div style={{position:"relative",borderRadius:"var(--radius-md)",overflow:"hidden",aspectRatio:"16/10",background:"linear-gradient(135deg,#1a1a2e,#16213e)"}}>
              {heroImgs.slot1
                ? <img src={heroImgs.slot1} alt="" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}} />
                : <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",color:"rgba(255,255,255,0.15)"}}><Icon name="bolt" size={64} stroke={1}/></div>
              }
              <div style={{position:"absolute",bottom:10,insetInlineStart:10,background:"rgba(0,0,0,0.65)",backdropFilter:"blur(6px)",padding:"5px 10px",borderRadius:"var(--radius)"}}>
                <div style={{color:"var(--brand)",fontSize:"0.58rem",fontFamily:"var(--f-mono)",fontWeight:700,letterSpacing:"0.08em"}}>FEATURED</div>
                <div style={{color:"#fff",fontSize:"0.72rem",fontWeight:700}}>منتجات مميزة</div>
              </div>
              <button onClick={()=>navigate("shop")} style={{position:"absolute",bottom:10,insetInlineEnd:10,background:"var(--brand)",color:"#fff",border:0,borderRadius:"var(--radius)",padding:"6px 12px",fontFamily:"var(--f-ar)",fontWeight:700,fontSize:"0.72rem",cursor:"pointer",display:"inline-flex",alignItems:"center",gap:4}}>
                تسوق الآن <Icon name="arrow" size={11}/>
              </button>
              {editMode && (
                <SiteImageSlot src={null} folder="hero"
                  fallback={null}
                  onUpdate={url=>updateHeroImg("slot1",url)}
                  showToast={showToast}
                  style={{position:"absolute",inset:0,zIndex:5}}
                />
              )}
            </div>

            {/* Slots 2 & 3 — side by side */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>

              {/* Slot 2 */}
              <div style={{position:"relative",borderRadius:"var(--radius-md)",overflow:"hidden",aspectRatio:"1/1",background:"linear-gradient(135deg,#0f3460,#533483)"}}>
                {heroImgs.slot2
                  ? <img src={heroImgs.slot2} alt="" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}} />
                  : <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",color:"rgba(255,255,255,0.15)"}}><Icon name="tag" size={36} stroke={1}/></div>
                }
                <div style={{position:"absolute",bottom:8,insetInlineStart:8,background:"rgba(0,0,0,0.65)",backdropFilter:"blur(6px)",padding:"4px 8px",borderRadius:"var(--radius)"}}>
                  <div style={{color:"var(--brand)",fontSize:"0.55rem",fontFamily:"var(--f-mono)",fontWeight:700,letterSpacing:"0.08em"}}>OFFERS</div>
                  <div style={{color:"#fff",fontSize:"0.65rem",fontWeight:700}}>عرض الشهر</div>
                </div>
                <button onClick={()=>navigate("shop",{category:"offers"})} style={{position:"absolute",bottom:8,insetInlineEnd:8,background:"var(--brand)",color:"#fff",border:0,borderRadius:"var(--radius)",padding:"4px 9px",fontFamily:"var(--f-ar)",fontWeight:700,fontSize:"0.65rem",cursor:"pointer",display:"inline-flex",alignItems:"center",gap:3}}>
                  تسوق <Icon name="arrow" size={9}/>
                </button>
                {editMode && (
  <SiteImageSlot src={null} folder="hero"
    fallback={null}
    onUpdate={url=>updateHeroImg("slot2",url)}
    showToast={showToast}
    style={{position:"absolute",inset:0,zIndex:5}}
  />
)}
              </div>

              {/* Slot 3 */}
              <div style={{position:"relative",borderRadius:"var(--radius-md)",overflow:"hidden",aspectRatio:"1/1",background:"linear-gradient(135deg,#2d1b0e,#5c3317)"}}>
                {heroImgs.slot3
                  ? <img src={heroImgs.slot3} alt="" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}} />
                  : <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",color:"rgba(255,255,255,0.15)"}}><Icon name="case" size={36} stroke={1}/></div>
                }
                <div style={{position:"absolute",bottom:8,insetInlineStart:8,background:"rgba(0,0,0,0.65)",backdropFilter:"blur(6px)",padding:"4px 8px",borderRadius:"var(--radius)"}}>
                  <div style={{color:"var(--brand)",fontSize:"0.55rem",fontFamily:"var(--f-mono)",fontWeight:700,letterSpacing:"0.08em"}}>CATEGORIES</div>
                  <div style={{color:"#fff",fontSize:"0.65rem",fontWeight:700}}>كل الأقسام</div>
                </div>
                <button onClick={()=>navigate("shop")} style={{position:"absolute",bottom:8,insetInlineEnd:8,background:"var(--brand)",color:"#fff",border:0,borderRadius:"var(--radius)",padding:"4px 9px",fontFamily:"var(--f-ar)",fontWeight:700,fontSize:"0.65rem",cursor:"pointer",display:"inline-flex",alignItems:"center",gap:3}}>
                  تصفح <Icon name="arrow" size={9}/>
                </button>
                {editMode && (
                  <SiteImageSlot src={null} folder="hero"
                    fallback={null}
                    onUpdate={url=>updateHeroImg("slot3",url)}
                    showToast={showToast}
                    style={{position:"absolute",inset:0,zIndex:5}}
                  />
                )}
              </div>

            </div>
          </div>

        </div>
      </div>
      <HeroTicker />
    </section>
  );
};



/* ─── Sections ───────────────────────────────────────────────────────────── */
const Section = ({ id, num, eyebrow, title, children, cta }) => (
  <section id={id} className="section">
    <div className="wrap">
      <div className="sec-head">
        <div className="sec-eyebrow"><span className="num">{num}</span> <b>{eyebrow}</b></div>
        <h2 className="sec-title">{title}</h2>
        <div className="sec-rule" />
        {cta && <button className="sec-cta" onClick={cta.fn} style={{border:0,background:"none",cursor:"pointer"}}>{cta.label} <Icon name="chev" size={11}/></button>}
      </div>
      {children}
    </div>
  </section>
);

const TopSellingSection = ({ products, onAdd, navigate, onWish, isWished }) => {
  const [filter, setFilter] = useState("all");
  const tabs = [{ id:"all",label:"الكل" }, ...CATS.filter(c=>!["new","offers"].includes(c.id)).slice(0,5).map(c=>({ id:c.id, label:c.ar.replace("أدوات ","").replace("عدد ","").replace("اطقم ","طقم ") }))];
  const items = products.filter(p => {
    if (filter==="all") return true;
    const cats = Array.isArray(p.categories) ? p.categories : [];
    return cats.includes(filter) || p.category===filter;
});
  return (
    <Section id="top" num="03" eyebrow="TOP SELLING" title="الأكثر مبيعاً هذا الشهر" cta={{ label:"عرض كل المنتجات", fn:()=>navigate("shop") }}>
      <div className="tabs">
        {tabs.map(t => <button key={t.id} className={`tab ${filter===t.id?"on":""}`} onClick={()=>setFilter(t.id)} style={{border:0,background:"none"}}>{t.label}</button>)}
        <div className="tabs-spacer" />
        <button className="tabs-filter" style={{border:"1px solid var(--line)",background:"none",cursor:"pointer"}}><Icon name="filter" size={13}/> فرز</button>
      </div>
      {items.length===0
        ? <div style={{textAlign:"center",padding:"32px 0",color:"var(--ink-3)"}}>لا توجد منتجات بعد.</div>
        : <div className="cat-carousel">{sortPinned(items, PINNED_TOP_SELLING).slice(0,8).map(p=><ProductCard key={p.id} p={p} onAdd={onAdd} onNavigate={navigate} onWish={onWish} isWished={isWished?.(p.id)}/>)}</div>
      }
    </Section>
  );
};

const OffersSection = ({ products, onAdd, navigate, onWish, isWished }) => {
  const offerProducts = products.filter(p => p.is_offer && p.offer_price);
  if (!offerProducts.length) return null;
  return (
    <Section id="offers" num="04" eyebrow="DAILY OFFERS" title="عروض اليوم" cta={{ label:"كل العروض", fn:()=>navigate("shop",{category:"offers"}) }}>
      <div className="cat-carousel">
        {offerProducts.map(p=><ProductCard key={p.id} p={p} onAdd={onAdd} onNavigate={navigate} onWish={onWish} isWished={isWished?.(p.id)}/>)}
      </div>
    </Section>
  );
};

const CAT_BG_COLORS = {
  electric: "linear-gradient(135deg,#1a1a2e,#16213e)",
  battery:  "linear-gradient(135deg,#0f3460,#533483)",
  hand:     "linear-gradient(135deg,#2d1b0e,#5c3317)",
  measuring:"linear-gradient(135deg,#0d2137,#1a4a6b)",
  safety:   "linear-gradient(135deg,#1a0a00,#7c2d00)",
  car:      "linear-gradient(135deg,#0a1628,#1e3a5f)",
  garden:   "linear-gradient(135deg,#0a2010,#1a4d2e)",
  sets:     "linear-gradient(135deg,#1a1200,#4a3500)",
  new:      "linear-gradient(135deg,#1a0d2e,#3d1a6e)",
};

const CategoriesSection = ({ products, navigate, settings, onUpdateSettings, showToast, editMode }) => {
  const catImages = settings.cat_images?.value || {};
  const catsWithCount = CATS.filter(c=>!["new","offers"].includes(c.id)).map(c=>({ ...c, count:products.filter(p=>{
    const cats = Array.isArray(p.categories) ? p.categories : (p.category ? [p.category] : []);
    return cats.includes(c.id) || p.category === c.id;
  }).length }));

  const updateCatImage = async (catId, url) => {
    const next = { ...catImages, [catId]: url };
    await sb(`site_settings?key=eq.cat_images`, { method:"PATCH", prefer:"return=minimal", body: JSON.stringify({ value: next }) });
    onUpdateSettings("cat_images", next);
  };

  return (
    <Section id="categories" num="05" eyebrow="ALL DEPARTMENTS" title="تسوق حسب القسم">
      <div className="cats-grid">
        {catsWithCount.map((c,i) => (
          <button key={c.id} className="cat-tile" onClick={()=>navigate("shop",{category:c.id})} style={{border:"1px solid var(--line)",background:"var(--bg-2)",cursor:"pointer","--i":i}}>
            <div className="cat-tile-media" style={{position:"relative"}}>
              {catImages[c.id]
                ? <img src={catImages[c.id]} alt={c.ar} style={{width:"100%",height:"100%",objectFit:"cover",position:"absolute",inset:0}} />
                : <div style={{position:"absolute",inset:0,background:CAT_BG_COLORS[c.id]||"var(--bg-3)"}} />
              }
              <div className="cat-tile-stripes" style={{zIndex:1}} />
              <div className="cat-tile-icon" style={{zIndex:2}}><Icon name={c.icon} size={32} stroke={1.4}/></div>
              {editMode && (
  <button style={{position:"absolute",top:8,insetInlineEnd:8,zIndex:10,background:"var(--brand)",border:0,borderRadius:"var(--radius)",width:34,height:34,display:"grid",placeItems:"center",color:"#fff",cursor:"pointer"}}
    onClick={e => {
      e.stopPropagation();
      const inp = document.createElement("input");
      inp.type = "file";
      inp.accept = "image/*";
      inp.onchange = async () => {
        try {
          const file = inp.files[0];
          const url = await sbUpload("protech-media", "banners/" + uid() + "-garden-" + file.name.replace(/\s/g,"_"), file);
          await sb('site_settings?key=eq.garden_banner', {method:"PATCH", prefer:"return=minimal", body:JSON.stringify({value:url})});
          updateSettings("garden_banner", url);
          showToast("تم تحديث الصورة ✓");
        } catch(err) {
          showToast("فشل: " + err.message, "error");
        }
      };
      inp.click();
    }}>
    <Icon name="image" size={15}/>
  </button>
)}
            </div>
            <div className="cat-tile-body">
              <div className="cat-tile-title"><b>{c.ar}</b><small>{c.en}</small></div>
              <div className="cat-tile-foot"><span>{c.count} منتج</span><Icon name="chev" size={13}/></div>
            </div>
          </button>
        ))}
      </div>
    </Section>
  );
};

const DealBanners = ({ settings, onUpdateSettings, showToast, editMode, navigate }) => {
  const banners = settings.banners?.value || {};
  const updateBanner = async (key, url) => {
    const next = { ...banners, [key]: url };
    await sb(`site_settings?key=eq.banners`, { method:"PATCH", prefer:"return=minimal", body: JSON.stringify({ value: next }) });
    onUpdateSettings("banners", next);
  };
  const BNR_META = [
    { key:"banner1", cls:"bnr-1", tag:"اطقم أدوات وكومبو", h3:"طقم أدوات كامل\nبسعر موفر", p:"طقم نجار • طقم سباك • طقم كهربائي", cta:"شاهد الطقم", action:()=>navigate("shop",{category:"sets"}) },
    { key:"banner2", cls:"bnr-2", tag:"بطاقة الولاء", h3:"مع كل طلب\nبطاقة خصم ١٠٠ ج.م", p:"أهدِ صاحبك بطاقة أو استخدمها في طلبك التاني", cta:"اعرف أكثر", action:()=>navigate("info","loyalty") },
    { key:"banner3", cls:"bnr-3", tag:"ماركات رسمية", h3:"Total و Wadfow\nمن الوكيل مباشرة", p:"منتجات أصلية ١٠٠٪ مع ضمان الوكيل", cta:"تصفح كل المنتجات", action:()=>navigate("shop") },
  ];
  return (
    <div className="banners-wrap" style={{ padding:"0 16px", marginBottom:0 }}>
      <div className="banners">
        {BNR_META.map(b => (
          <div key={b.key} className={`bnr ${b.cls}`} style={{padding:0}} onClick={b.action}>
            {banners[b.key] && <div className="bnr-bg" style={{backgroundImage:`url(${banners[b.key]})`}}/>}
            <div className="bnr-stripes"/>
            {editMode && (
              <button style={{position:"absolute",top:8,insetInlineEnd:8,zIndex:10,background:"var(--brand)",border:0,borderRadius:"var(--radius)",width:34,height:34,display:"grid",placeItems:"center",color:"#fff",cursor:"pointer"}}
                onClick={e => { e.stopPropagation(); const inp=document.createElement("input"); inp.type="file"; inp.accept="image/*"; inp.onchange=async()=>{ try{ const url=await sbUpload("protech-media",`banners/${uid()}-${inp.files[0].name.replace(/\s/g,"_")}`,inp.files[0]); updateBanner(b.key,url); }catch{} }; inp.click(); }}>
                <Icon name="image" size={15}/>
              </button>
            )}
            <div className="bnr-inner">
              <div className="bnr-tag">{b.tag}</div>
              <h3>{b.h3.split("\n").map((l,i)=><span key={i}>{l}{i===0&&<br/>}</span>)}</h3>
              <p>{b.p}</p>
              <span className="bnr-cta">{b.cta} <Icon name="arrow" size={13}/></span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const CategoryRail = ({ catId, num, eyebrow, title, desc, products, onAdd, navigate, onWish, isWished, pinnedCodes }) => {
  const items = products.filter(p => {
    const cats = Array.isArray(p.categories) ? p.categories : [];
    return cats.includes(catId) || p.category === catId;
});
  const sorted = pinnedCodes ? sortPinned(items, pinnedCodes) : items;
  if (!items.length) return null;
  return (
    <section id={catId} className="section cat-rail">
      <div className="wrap">
        <div className="rail-hero">
          <div className="rail-hero-text">
            <div className="sec-eyebrow"><span className="num">{num}</span> <b>{eyebrow}</b></div>
            <h2 className="sec-title">{title}</h2>
            <p className="rail-desc">{desc}</p>
            <button className="btn btn-dark" onClick={()=>navigate("shop",{category:catId})} style={{border:0,cursor:"pointer",alignSelf:"flex-start"}}>
              تصفح القسم كاملاً <Icon name="arrow" size={13}/>
            </button>
            <div className="rail-stat">
              <div><b>{items.length}</b><small>منتج متاح</small></div>
              <div><b>٦ أشهر</b><small>ضمان الوكيل</small></div>
              <div><b>٤.٨</b><small>تقييم العملاء</small></div>
            </div>
          </div>
          <div style={{overflow:"hidden"}}>
            <div className="cat-carousel">
              {sorted.map(p=><ProductCard key={p.id} p={p} onAdd={onAdd} onNavigate={navigate} onWish={onWish} isWished={isWished?.(p.id)}/>)}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const BrandsSection = () => (
  <section id="brands" className="section">
    <div className="wrap">
      <div className="sec-head">
        <div className="sec-eyebrow"><span className="num">06</span> <b>OFFICIAL BRANDS</b></div>
        <h2 className="sec-title">ماركات نحمل وكالتها الرسمية</h2>
        <div className="sec-rule" />
      </div>
      <div className="brands-grid">
        {[{name:"TOTAL",tag:"الوكيل الرسمي"},{name:"WADFOW",tag:"الوكيل الرسمي"},{name:"MAKITA"},{name:"DEWALT"},{name:"BOSCH"},{name:"STANLEY"},{name:"BLACK+DECKER"},{name:"INGCO"}].map(b=>(
          <div key={b.name} className="brand-tile">
            <span className="brand-logo">{b.name}</span>
            {b.tag && <small className="brand-tag">{b.tag}</small>}
          </div>
        ))}
      </div>
    </div>
  </section>
);

const REVIEWS_DATA = [
  { name:"محمود السيد", role:"عميل • القاهرة", rating:5, text:"اشتريت دريل توتال من بروتيك، جودة ممتازة وسعر أقل من السوق. التوصيل وصل بيتي في المعادي خلال ٣ أيام." },
  { name:"Ahmed Farouk", role:"عميل • الإسكندرية", rating:5, text:"أدوات ممتازة وأسعار معقولة. الطلب وصل بسرعة والتغليف كان محترم جداً، هكمل شراء من عندكم." },
  { name:"كريم عبد الرحمن", role:"عميل • الجيزة", rating:5, text:"اشتريت طقم أدوات وادفو وكنت متردد في البداية، لكن الجودة فاقت توقعاتي. خدمة عملاء ممتازة على الواتساب." },
];
const ReviewsSection = () => (
  <Section id="reviews" num="07" eyebrow="REAL REVIEWS" title="عملاؤنا يشهدون">
    <div className="reviews-grid">
      {REVIEWS_DATA.map((r,i) => (
        <article key={i} className="review">
          <div className="review-head"><Stars rating={r.rating} size={13}/><span className="review-verified"><Icon name="check" size={11}/> مشتري موثق</span></div>
          <p className="review-text">{r.text}</p>
          <div className="review-foot">
            <div className="review-avatar">{r.name[0]}</div>
            <div><b>{r.name}</b><small>{r.role}</small></div>
          </div>
        </article>
      ))}
    </div>
    <div className="reviews-strip">
      <div><b>٤.٨ / ٥</b><small>متوسط التقييم</small></div><span className="vr"/>
      <div><b>١٨٬٤٠٠+</b><small>مراجعة موثقة</small></div><span className="vr"/>
      <div><b>٩٤٪</b><small>يوصون بالمتجر</small></div><span className="vr"/>
      <div><b>٣-٤ أيام</b><small>متوسط التوصيل</small></div>
    </div>
  </Section>
);

/* ─── Footer ─────────────────────────────────────────────────────────────── */
const SiteFooter = ({ logoSrc, navigate }) => (
  <footer className="site-footer">
    <div className="wrap foot-top">
      <div className="foot-brand">
        <div className="foot-logo">{logoSrc && <img src={logoSrc} alt="Protech"/>}</div>
        <p>بروتيك — متجر إلكتروني للأدوات والمعدات في مصر. الوكيل الرسمي لـ Total و Wadfow. توصيل لكل المحافظات خلال ٣-٤ أيام.</p>
        <div className="foot-contact">
          <span><Icon name="phone" size={13}/> ٠١٠٩١٠١١٣٨٠</span>
          <span><Icon name="chat" size={13}/> واتساب ٢٤/٧</span>
        </div>
      </div>
      <div className="foot-col">
        <h5>التسوق</h5>
        <ul>
          <li onClick={()=>navigate("shop")}>كل الأقسام</li>
          <li onClick={()=>navigate("shop",{category:"offers"})}>العروض</li>
          <li onClick={()=>navigate("shop",{category:"sets"})}>اطقم وكومبو</li>
          <li onClick={()=>navigate("shop",{category:"new"})}>وصل حديثاً</li>
        </ul>
      </div>
      <div className="foot-col">
        <h5>طلباتي</h5>
        <ul>
          <li onClick={()=>navigate("orders")}>تتبع طلبي</li>
          <li onClick={()=>window.open("https://bosta.co/en-eg/tracking-shipments","_blank")}>تتبع الشحنة</li>
        </ul>
      </div>
      <div className="foot-col">
        <h5>الدعم</h5>
        <ul>
          <li onClick={()=>navigate("info","loyalty")}>بطاقة الولاء 🎁</li>
          <li onClick={()=>navigate("info","shipping")}>الشحن والتوصيل</li>
          <li onClick={()=>navigate("info","returns")}>الاستبدال والاسترجاع</li>
          <li onClick={()=>navigate("info","warranty")}>ضمان الأدوات</li>
          <li onClick={()=>navigate("info","privacy")}>سياسة الخصوصية</li>
          <li onClick={()=>navigate("info","terms")}>الشروط والأحكام</li>
        </ul>
      </div>
      <div className="foot-col foot-news">
        <h5>اشترك للعروض</h5>
        <div className="news-row"><input placeholder="بريدك الإلكتروني"/><button><Icon name="arrow" size={13}/></button></div>
        <small>عروض حصرية وتخفيضات موسمية مباشرة على بريدك.</small>
      </div>
    </div>
    <div className="foot-bot"><div className="wrap foot-bot-inner">
      <span>© ٢٠٢٦ بروتيك. جميع الحقوق محفوظة.</span>
      <span className="foot-links">
        <span onClick={()=>navigate("info","privacy")}>سياسة الخصوصية</span>
        <span onClick={()=>navigate("info","terms")}>الشروط والأحكام</span>
        <span onClick={()=>navigate("info","returns")}>سياسة الإرجاع</span>
      </span>
    </div></div>
  </footer>
);

/* ─── Cart Drawer ────────────────────────────────────────────────────────── */
const CartDrawer = ({ open, items, onClose, onInc, onDec, onRemove, navigate }) => {
  const total = items.reduce((s,it) => s + (it.is_offer && it.offer_price ? it.offer_price : it.price) * it.qty, 0);
  const shipping = total >= FREE_SHIPPING_THRESHOLD ? 0 : null;
  return (
    <>
      <div className={`drawer-scrim${open?" on":""}`} onClick={onClose}/>
      <aside className={`drawer${open?" on":""}`}>
        <div className="drawer-head">
          <div><b>سلة المشتريات</b><small>{items.length} {items.length===1?"منتج":"منتجات"}</small></div>
          <button className="icon-btn" onClick={onClose}><Icon name="close" size={17}/></button>
        </div>
        {items.length===0 ? (
          <div className="drawer-empty">
            <div className="empty-icon"><Icon name="cart" size={36} stroke={1.2}/></div>
            <b>سلتك فاضية</b><p>ابدأ بتصفح العروض أو اختار قسم من الأقسام.</p>
            <button className="btn btn-primary" onClick={onClose} style={{border:0}}>تصفح المنتجات</button>
          </div>
        ) : (
          <>
            <div className="drawer-body">
              {items.map(it => {
                const displayPrice = it.is_offer && it.offer_price ? it.offer_price : it.price;
                const thumb = Array.isArray(it.images) ? it.images[0] : null;
                return (
                  <div key={it.id} className="drawer-item">
                    <div className="drawer-media">{thumb?<img src={thumb} alt={it.name}/>:<PP stripe={(it.id||0)%6} label={it.name} sku={it.code}/>}</div>
                    <div className="drawer-meta">
                      <div className="drawer-sku">{it.code}</div>
                      <div className="drawer-name">{it.name}</div>
                      <div className="drawer-price"><span className="amt">{fmtEGP(displayPrice)} ج.م</span></div>
                      <div className="drawer-actions">
                        <div className="qty">
                          <button onClick={()=>onDec(it.id)}><Icon name="minus" size={11}/></button>
                          <span>{it.qty}</span>
                          <button onClick={()=>onInc(it.id)}><Icon name="plus" size={11}/></button>
                        </div>
                        <button className="drawer-del" onClick={()=>onRemove(it.id)}><Icon name="trash" size={13}/> حذف</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="drawer-foot">
              <div className="drawer-row"><span>المجموع الفرعي</span><b>{fmtEGP(total)} ج.م</b></div>
              <div className="drawer-row"><span>الشحن</span><b style={{color:shipping===0?"var(--green)":"var(--ink-3)"}}>{shipping===0?`مجاني 🎉 (فوق ${FREE_SHIPPING_THRESHOLD.toLocaleString()} ج.م)`:"يُحسب حسب المحافظة"}</b></div>
              {total < FREE_SHIPPING_THRESHOLD && <div style={{fontSize:"0.75rem",color:"var(--brand)",background:"var(--brand-soft)",padding:"7px 10px",borderRadius:"var(--radius)"}}> أضف {fmtEGP(FREE_SHIPPING_THRESHOLD-total)} ج.م للحصول على شحن مجاني</div>}
              <div className="drawer-row total"><span>الإجمالي</span><b>{fmtEGP(total)} ج.م +شحن</b></div>
              <button className="btn btn-primary btn-block" style={{border:0}} onClick={()=>{
                window.fbq?.('track', 'InitiateCheckout', {
                  num_items: items.reduce((s, it) => s + it.qty, 0),
                  value: total,
                  currency: 'EGP',
                });
                onClose();
                navigate("checkout");
              }}>إتمام الشراء <Icon name="arrow" size={13}/></button>
              <small className="drawer-note"><Icon name="shield" size={11}/> دفع آمن • إرجاع خلال ٧ أيام</small>
            </div>
          </>
        )}
      </aside>
    </>
  );
};

/* ─── Wishlist Drawer ────────────────────────────────────────────────────── */
const WishlistDrawer = ({ open, items, onClose, onAddToCart, onRemove }) => (
  <>
    <div className={`drawer-scrim${open?" on":""}`} onClick={onClose}/>
    <aside className={`drawer${open?" on":""}`}>
      <div className="drawer-head">
        <div><b>المفضلة</b><small>{items.length} منتج</small></div>
        <button className="icon-btn" onClick={onClose}><Icon name="close" size={17}/></button>
      </div>
      {items.length===0 ? (
        <div className="drawer-empty">
          <div className="empty-icon"><Icon name="heart" size={36} stroke={1.2}/></div>
          <b>قائمة المفضلة فاضية</b>
          <p>اضغط على قلب أي منتج لإضافته للمفضلة.</p>
          <button className="btn btn-primary" onClick={onClose} style={{border:0}}>تصفح المنتجات</button>
        </div>
      ) : (
        <>
          <div className="drawer-body">
            {items.map(it => {
              const thumb = Array.isArray(it.images) ? it.images[0] : null;
              const price = it.is_offer && it.offer_price ? it.offer_price : it.price;
              return (
                <div key={it.id} className="drawer-item">
                  <div className="drawer-media">{thumb?<img src={thumb} alt={it.name}/>:<PP stripe={(it.id||0)%6} label={it.name} sku={it.code}/>}</div>
                  <div className="drawer-meta">
                    <div className="drawer-sku">{it.code}</div>
                    <div className="drawer-name">{it.name}</div>
                    <div className="drawer-price"><span className="amt">{fmtEGP(price)} ج.م</span></div>
                    <div className="drawer-actions">
                      <button className="add" style={{fontSize:"0.72rem",padding:"5px 9px"}} onClick={()=>onAddToCart(it)}>
                        <Icon name="plus" size={11}/> للسلة
                      </button>
                      <button className="drawer-del" onClick={()=>onRemove(it)}><Icon name="trash" size={13}/> حذف</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="drawer-foot">
            <button className="btn btn-primary btn-block" style={{border:0}}
              onClick={()=>{ items.forEach(p => onAddToCart(p)); onClose(); }}>
              إضافة الكل للسلة <Icon name="cart" size={14}/>
            </button>
            <button className="btn btn-ghost btn-block" style={{marginTop:6}} onClick={()=>{ items.forEach(p=>onRemove(p)); }}>
              مسح القائمة
            </button>
          </div>
        </>
      )}
    </aside>
  </>
);

/* ─── Shop page ──────────────────────────────────────────────────────────── */
const ShopPage = ({ products, onAdd, navigate, initialCat, initialSearch, onWish, isWished }) => {
  const [cat, setCat] = useState(initialCat || "all");
  const [search, setSearch] = useState(initialSearch || "");
  const [sort, setSort] = useState("default");

  useEffect(() => { if (initialCat) setCat(initialCat); }, [initialCat]);
  useEffect(() => { if (initialSearch) setSearch(initialSearch); }, [initialSearch]);

  let items = products.filter(p => {
    const cats = Array.isArray(p.categories) ? p.categories : [];
    const matchCat = cat==="all" || (cat==="offers" ? (p.is_offer && p.offer_price) : cat==="new" ? true : (cats.includes(cat) || p.category===cat));
    const s = search.toLowerCase();
    const matchSearch = !search || p.name?.toLowerCase().includes(s) || p.code?.toLowerCase().includes(s);
    return matchCat && matchSearch;
  });
  if (sort==="price_asc") items=[...items].sort((a,b)=>a.price-b.price);
  if (sort==="price_desc") items=[...items].sort((a,b)=>b.price-a.price);

  return (
    <div className="shop-layout">
      <h1 style={{margin:"0 0 24px",fontSize:"1.6rem",fontWeight:900}}>كل المنتجات</h1>
      <div className="shop-grid">
        <div className="shop-sidebar">
          <div className="sidebar-box">
            <h4>بحث</h4>
            <input className="form-input" value={search} onChange={e=>setSearch(e.target.value)} placeholder="اسم المنتج أو الكود…"/>
          </div>
          <div className="sidebar-box">
            <h4>الأقسام</h4>
            {[{id:"all",ar:"الكل"},...CATS].map(c => (
              <button key={c.id} className={`sidebar-cat-btn${cat===c.id?" on":""}`} onClick={()=>setCat(c.id)}>{c.ar}</button>
            ))}
          </div>
        </div>
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18,flexWrap:"wrap",gap:10}}>
            <span style={{color:"var(--ink-3)",fontSize:"0.85rem"}}>{items.length} منتج</span>
            <select className="form-input" style={{width:"auto",padding:"7px 12px"}} value={sort} onChange={e=>setSort(e.target.value)}>
              <option value="default">الترتيب الافتراضي</option>
              <option value="price_asc">السعر: من الأقل</option>
              <option value="price_desc">السعر: من الأعلى</option>
            </select>
          </div>
          {items.length===0
            ? <div style={{textAlign:"center",padding:"60px 0",color:"var(--ink-3)"}}><Icon name="search" size={40}/><p style={{marginTop:12}}>لا توجد نتائج.</p></div>
            : <div className="rail rail-3">{items.map(p=><ProductCard key={p.id} p={p} onAdd={onAdd} onNavigate={navigate} onWish={onWish} isWished={isWished?.(p.id)}/>)}</div>
          }
        </div>
      </div>
    </div>
  );
};

/* ─── Product Detail ─────────────────────────────────────────────────────── */
const ProductDetailPage = ({ product, onAdd, products, navigate, onWish, isWished }) => {
  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState(0);
  useEffect(() => {
    window.fbq?.('track', 'ViewContent', {
      content_ids: [product.id],
      content_name: product.name,
      content_type: 'product',
      value: product.is_offer && product.offer_price ? product.offer_price : product.price,
      currency: 'EGP',
    });
  }, [product.id]);
  const imgs = Array.isArray(product.images) ? product.images : [];
  const suggested = products.filter(p=>p.id!==product.id && p.category===product.category).slice(0,4);
  const hasOffer = product.is_offer && product.offer_price && product.offer_price < product.price;
  const displayPrice = hasOffer ? product.offer_price : product.price;
  const discount = hasOffer ? Math.round((1-product.offer_price/product.price)*100) : (product.old_price>product.price ? Math.round((1-product.price/product.old_price)*100) : 0);
  const wished = isWished?.(product.id);
  return (
    <div className="product-detail">
      <div style={{fontSize:"0.8rem",color:"var(--ink-3)",marginBottom:24,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
        <button onClick={()=>navigate("home")} style={{border:0,background:"none",color:"var(--brand)",cursor:"pointer",fontFamily:"var(--f-ar)",fontSize:"0.8rem"}}>الرئيسية</button>›
        <button onClick={()=>navigate("shop")} style={{border:0,background:"none",color:"var(--brand)",cursor:"pointer",fontFamily:"var(--f-ar)",fontSize:"0.8rem"}}>المتجر</button>›
        <span>{product.name}</span>
      </div>
      <div className="product-grid">
        <div>
          <div className="gallery-main">
            {imgs[activeImg] ? <img src={optimizeImg(imgs[activeImg], 800)} alt={product.name}/>: <PP stripe={(product.id||0)%6} label={product.name} sku={product.code}/>}
          </div>
          {imgs.length>1 && (
            <div className="gallery-thumbs">
              {imgs.map((img,i)=>(
                <div key={i} className={`gallery-thumb${activeImg===i?" on":""}`} onClick={()=>setActiveImg(i)}>
                  <img src={optimizeImg(img, 120)} alt=""/>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div style={{fontFamily:"var(--f-mono)",fontSize:"0.72rem",color:"var(--ink-3)"}}>{product.code}</div>
          <h1 style={{margin:0,fontSize:"1.6rem",fontWeight:900,lineHeight:1.3}}>{product.name}</h1>
          {product.brand && <div style={{fontSize:"0.78rem",fontFamily:"var(--f-mono)",color:"var(--brand)",fontWeight:700}}>{product.brand.toUpperCase()}</div>}
          {product.description && <p style={{color:"var(--ink-2)",lineHeight:1.7,fontSize:"0.92rem",margin:0}}>{product.description}</p>}
          <div style={{display:"flex",alignItems:"baseline",gap:12}}>
            <span style={{fontSize:"2.2rem",fontWeight:900,fontFamily:"var(--f-mono)",color:hasOffer?"var(--red)":"var(--brand)"}}>{fmtEGP(displayPrice)}</span>
            <span style={{fontSize:"0.88rem",color:"var(--ink-3)"}}>ج.م</span>
            {discount>0 && <span style={{textDecoration:"line-through",color:"var(--ink-3)",fontSize:"1rem"}}>{fmtEGP(product.price)} ج.م</span>}
            {discount>0 && <span className="badge badge-offer" style={{position:"static"}}>خصم {discount}٪</span>}
          </div>
          <div style={{color:product.qty>0?"var(--green)":"var(--red)",fontWeight:700,fontSize:"0.85rem"}}>
            {product.qty>0 ? `✓ متوفر (${product.qty} قطعة في المخزون)` : "✗ نفذ المخزون"}
          </div>
          {product.qty>0 && (
            <>
              <div className="qty-row">
                <span style={{fontWeight:700,fontSize:"0.9rem"}}>الكمية:</span>
                <div className="qty-ctrl">
                  <button onClick={()=>setQty(q=>Math.max(1,q-1))}>−</button>
                  <span>{qty}</span>
                  <button onClick={()=>setQty(q=>Math.min(product.qty,q+1))}>+</button>
                </div>
              </div>
              <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                <button className="btn btn-primary lg" style={{flex:1,border:0}} onClick={()=>onAdd({...product,qty})}>+ أضف للسلة</button>
                <button className="btn btn-dark lg" style={{flex:1,border:0}} onClick={()=>{onAdd({...product,qty});navigate("checkout");}}>اشترِ الآن</button>
                <button onClick={()=>onWish?.(product)}
                  style={{width:44,height:44,border:`1.5px solid ${wished?"#e53e3e":"var(--line)"}`,borderRadius:"var(--radius)",background:wished?"#fff0f0":"var(--bg)",color:wished?"#e53e3e":"var(--ink-3)",display:"grid",placeItems:"center",cursor:"pointer",flexShrink:0,transition:"all .15s"}}>
                  <Icon name="heart" size={18}/>
                </button>
              </div>
            </>
          )}
          <div style={{background:"var(--bg-2)",borderRadius:"var(--radius)",padding:"14px 16px",display:"flex",gap:20,flexWrap:"wrap"}}>
            {[["🚚","شحن ٣-٤ أيام"],["🔒","منتج أصلي"],["🔧","ضمان ٦ أشهر"],["↩️","استبدال ٧ أيام"]].map(([ic,t])=>(
              <span key={t} style={{fontSize:"0.8rem",color:"var(--ink-2)",display:"flex",alignItems:"center",gap:5}}><span>{ic}</span>{t}</span>
            ))}
          </div>
        </div>
      </div>
      {suggested.length>0 && (
        <div>
          <h2 style={{fontSize:"1.3rem",fontWeight:900,marginBottom:18}}>منتجات قد تعجبك</h2>
          <div className="rail rail-4">{suggested.map(p=><ProductCard key={p.id} p={p} onAdd={onAdd} onNavigate={navigate} onWish={onWish} isWished={isWished?.(p.id)}/>)}</div>
        </div>
      )}
    </div>
  );
};

/* ─── Checkout ───────────────────────────────────────────────────────────── */
const CheckoutPage = ({ cart, navigate, setCart, products, setProducts, showToast }) => {
  const [form, setForm] = useState({ name:"", phone:"", address:"", city:"", notes:"" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const getPrice = (it) => it.is_offer && it.offer_price ? it.offer_price : it.price;
  const total = cart.reduce((s,it)=>s+getPrice(it)*it.qty,0);

  // Calculate shipping based on selected city
  // Real Bosta formula — matches dashboard breakdown within ~0.3 EGP:
  //   COD = subtotal + base_rate
  //   cod_fee = max(0, COD - 2000) × 0.01
  //   vat = (base_rate + cod_fee) × 0.14
  //   shipping = base_rate + cod_fee + vat
  const getShipping = (city) => {
    if (!city || total >= FREE_SHIPPING_THRESHOLD) return 0;
    const baseRate = BOSTA_SHIPPING_RATES[city] || 131;
    let shipping;
    if (total + 1.14 * baseRate >= 2000) {
      shipping = Math.ceil((1.14 * baseRate + 0.0114 * total - 22.8) / 0.9886);
    } else {
      shipping = Math.ceil(1.14 * baseRate);
    }
    return Math.max(0, shipping - 20);
  };
  const shipping = form.city ? getShipping(form.city) : 0;
const grand = total + shipping;

  const validate = () => {
    const e={};
    if(!form.name.trim()) e.name="الاسم مطلوب";
    if(!/^01[0-9]{9}$/.test(form.phone)) e.phone="رقم الهاتف غير صحيح (01XXXXXXXXX)";
    if(!form.address.trim() || form.address.trim().length < 10) e.address="العنوان مطلوب (١٠ أحرف على الأقل)";
    if(!form.city) e.city="المحافظة مطلوبة";
    setErrors(e);
    return !Object.keys(e).length;
  };

  const submit = async () => {
    if(!validate()||!cart.length) return;
    setLoading(true);
    try {
      const code = mkCode();
      const orderId = uid();
      await sb("orders", {
        method:"POST", prefer:"return=minimal",
        body: JSON.stringify({
  id: orderId,
  code, customer_name:form.name, phone:form.phone,
  ship_code:"",
  address: `${form.city} - ${form.address}`,
  city: form.city,
  notes: form.notes || "",
  products: cart.map(i=>({id:i.id,code:i.code,name:i.name,qty:i.qty,price:getPrice(i)})),
  total:grand, status:"Processing",
  date: new Date().toISOString().split("T")[0],
  est_shipping:shipping, actual_shipping:0, warehouse_confirmed:false,
}),
      });

      // Fire Bosta shipment (non-blocking)
      fetch('https://protech-stores.vercel.app/api/bosta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          customerName: form.name,
          phone:        form.phone,
          city:         form.city,
          address:      form.address,
          notes:        form.notes || '',
          total:        grand,
        }),
      })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          console.log('✅ Bosta shipment created:', data.trackingNumber);
        } else {
          console.warn('⚠️ Bosta returned error:', data);
        }
      })
      .catch(err => {
        console.warn('⚠️ Bosta fetch failed (order still saved):', err);
      });

      for(const item of cart){
        const dbP=products.find(p=>p.id===item.id);
        if(dbP) await sb(`products?id=eq.${item.id}`,{method:"PATCH",prefer:"return=minimal",body:JSON.stringify({qty:Math.max(0,dbP.qty-item.qty)})});
      }
      setProducts(prev=>prev.map(p=>{ const ci=cart.find(i=>i.id===p.id); return ci?{...p,qty:Math.max(0,p.qty-ci.qty)}:p; }));
      window.fbq?.('track', 'Purchase', {
        value: grand,
        currency: 'EGP',
        content_ids: cart.map(i => i.id),
        content_type: 'product',
        num_items: cart.reduce((s, i) => s + i.qty, 0),
      });
      setCart([]);
      navigate("confirmation",{orderCode:code,customerName:form.name,phone:form.phone,total:grand});
    } catch(e) { showToast("حدث خطأ. حاول مرة أخرى.","error"); }
    setLoading(false);
  };

  const inp = (f) => ({ className:`form-input${errors[f]?" err":""}`, value:form[f], onChange:e=>setForm(x=>({...x,[f]:e.target.value})) });

  if(!cart.length) return <div style={{textAlign:"center",padding:"80px 16px"}}><h2>سلتك فارغة</h2><button className="btn btn-primary" style={{marginTop:20,border:0}} onClick={()=>navigate("shop")}>العودة للتسوق</button></div>;

  return (
    <div className="checkout-wrap">
      <h1 style={{margin:"0 0 6px",fontWeight:900}}>إتمام الطلب</h1>
      <p style={{color:"var(--ink-3)",marginBottom:28}}>أدخل بياناتك لإتمام عملية الشراء</p>
      <div className="checkout-grid">
        <div>
          <div className="checkout-section">
            <h3><span className="step-num">١</span> بيانات التواصل</h3>
            <div className="form-row">
              <div className="form-group"><label>الاسم الكامل *</label><input {...inp("name")} placeholder="محمد أحمد"/>{errors.name&&<span className="form-err">{errors.name}</span>}</div>
              <div className="form-group"><label>رقم الهاتف *</label><input {...inp("phone")} placeholder="01XXXXXXXXX" dir="ltr"/>{errors.phone&&<span className="form-err">{errors.phone}</span>}</div>
            </div>
          </div>
          <div className="checkout-section">
            <h3><span className="step-num">٢</span> عنوان التوصيل</h3>
            <div className="form-group"><label>المحافظة *</label>
              <select className={`form-input${errors.city?" err":""}`} value={form.city} onChange={e=>setForm(x=>({...x,city:e.target.value}))}>
                <option value="">اختر المحافظة</option>
              {["القاهرة","الجيزة","الإسكندرية","الشرقية","الدقهلية","القليوبية","المنوفية","الغربية","كفر الشيخ","البحيرة","الإسماعيلية","السويس","بورسعيد","دمياط","سوهاج","أسيوط","المنيا","الفيوم","بني سويف","قنا","الأقصر","أسوان","مرسي مطروح","الساحل الشمالي","البحر الأحمر","الوادي الجديد","شمال سيناء","جنوب سيناء"].map(g=><option key={g}>{g}</option>)}
              </select>
              {errors.city&&<span className="form-err">{errors.city}</span>}
              {form.city && total < FREE_SHIPPING_THRESHOLD && (
                <div style={{fontSize:"0.78rem",color:"var(--brand)",marginTop:4,fontWeight:600}}>
                  تكلفة الشحن إلى {form.city}: {fmtEGP(shipping)} ج.م
                </div>
              )}
            </div>
            <div className="form-group"><label>العنوان بالتفصيل *</label><input {...inp("address")} placeholder="الشارع، الحي، المدينة"/>{errors.address&&<span className="form-err">{errors.address}</span>}</div>
            <div className="form-group"><label>ملاحظات (اختياري)</label><textarea className="form-input" style={{height:72,resize:"none"}} value={form.notes} onChange={e=>setForm(x=>({...x,notes:e.target.value}))} placeholder="أي تعليمات خاصة بالتوصيل…"/></div>
          </div>
          <div className="checkout-section" style={{borderColor:"var(--brand)",borderWidth:2}}>
            <h3><span className="step-num">٣</span> طريقة الدفع</h3>
            <div className="payment-option"><div style={{fontSize:26}}>💰</div><div><b>الدفع عند الاستلام</b><br/><small style={{color:"var(--ink-3)"}}>ادفع نقداً عند وصول طلبك</small></div><span className="badge" style={{position:"static",marginInlineStart:"auto"}}>✓ المتاح</span></div>
          </div>
        </div>
        <div className="order-summary">
          <h3>ملخص طلبك</h3>
          <div className="summary-items">
            {cart.map(it=>{
              const thumb=Array.isArray(it.images)?it.images[0]:null;
              return (
                <div key={it.id} className="summary-item">
                  <div className="summary-item-img">{thumb?<img src={thumb} alt=""/>:<PP stripe={(it.id||0)%6} label={it.name} sku={it.code}/>}</div>
                  <div style={{flex:1}}><div className="summary-item-name">{it.name}</div><div className="summary-item-qty">× {it.qty}</div></div>
                  <div className="summary-item-price">{fmtEGP(getPrice(it)*it.qty)}</div>
                </div>
              );
            })}
          </div>
          <div className="summary-divider"/>
          <div className="summary-row"><span style={{color:"var(--ink-3)"}}>المجموع الفرعي</span><b>{fmtEGP(total)} ج.م</b></div>
          <div className="summary-row">
            <span style={{color:"var(--ink-3)"}}>الشحن {form.city ? `(${form.city})` : ""}</span>
            <b style={{color:shipping===0?"var(--green)":undefined}}>
              {!form.city ? "اختر المحافظة" : shipping===0 ? "مجاني 🎉" : `${fmtEGP(shipping)} ج.م`}
            </b>
          </div>
          {total < FREE_SHIPPING_THRESHOLD && (
            <div style={{fontSize:"0.75rem",color:"var(--brand)",background:"var(--brand-soft)",padding:"7px 10px",borderRadius:"var(--radius)",marginBottom:6}}>
              أضف {fmtEGP(FREE_SHIPPING_THRESHOLD-total)} ج.م للحصول على شحن مجاني
            </div>
          )}
          <div className="summary-total"><span>الإجمالي</span><span className="amt">{fmtEGP(grand)} ج.م</span></div>
          <button className="btn btn-primary btn-block" style={{marginTop:18,padding:14,fontSize:"0.95rem",border:0}} onClick={submit} disabled={loading}>
            {loading?"جاري إتمام الطلب…":"اشترِ الآن 🛒"}
          </button>
          <p style={{textAlign:"center",fontSize:"0.72rem",color:"var(--ink-3)",marginTop:8}}>بالضغط توافق على شروط الخدمة.</p>
        </div>
      </div>
    </div>
  );
}; 

/* ─── Confirmation ───────────────────────────────────────────────────────── */
const ConfirmationPage = ({ pageData, navigate }) => {
  const { orderCode, customerName, phone, total } = pageData || {};
  return (
    <div className="confirm-wrap">
      <div className="confirm-card">
        <div className="confirm-icon"><Icon name="check" size={32}/></div>
        <h2 style={{margin:"0 0 4px",fontWeight:900,color:"var(--green)"}}>تم تأكيد طلبك!</h2>
        <p style={{color:"var(--ink-3)",margin:"0 0 8px"}}>شكراً لك {customerName}، تم إرسال تفاصيل طلبك.</p>
        <div className="confirm-code">{orderCode}</div>
        <div className="confirm-meta">
          <div className="confirm-meta-row"><span style={{color:"var(--ink-3)"}}>إجمالي الطلب</span><b>{fmtEGP(total)} ج.م</b></div>
          <div className="confirm-meta-row"><span style={{color:"var(--ink-3)"}}>طريقة الدفع</span><b>الدفع عند الاستلام</b></div>
          <div className="confirm-meta-row"><span style={{color:"var(--ink-3)"}}>التوصيل المتوقع</span><b style={{color:"var(--green)"}}>٣ - ٤ أيام</b></div>
        </div>
        <div style={{background:"var(--brand-soft)",border:"1.5px solid var(--brand)",borderRadius:"var(--radius-md)",padding:"18px",marginBottom:20,textAlign:"right"}}>
          <div style={{fontWeight:800,fontSize:"0.95rem",marginBottom:8,display:"flex",alignItems:"center",gap:8,color:"var(--brand-ink)"}}>
            <Icon name="whatsapp" size={20}/> سيصلك كود الشحن على واتساب
          </div>
          <p style={{margin:0,fontSize:"0.88rem",color:"var(--ink-2)",lineHeight:1.7}}>
            بعد تجهيز طلبك، سنرسل لك رقم تتبع الشحنة عبر واتساب على رقم <b style={{fontFamily:"var(--f-mono)"}}>{phone}</b> — عادةً خلال ٢٤ ساعة من تأكيد الطلب.
          </p>
          <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noreferrer"
            style={{display:"inline-flex",alignItems:"center",gap:6,marginTop:12,background:"#25D366",color:"#fff",padding:"8px 16px",borderRadius:"var(--radius)",fontWeight:700,fontSize:"0.85rem",textDecoration:"none"}}>
            <Icon name="whatsapp" size={14}/> تواصل معنا على واتساب
          </a>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <button className="btn btn-primary btn-block" style={{padding:13,border:0}} onClick={()=>navigate("home")}>العودة للرئيسية</button>
          <button className="btn btn-ghost btn-block" style={{padding:11}} onClick={()=>navigate("shop")}>مواصلة التسوق</button>
        </div>
      </div>
    </div>
  );
};

/* ─── Orders tracking page ───────────────────────────────────────────────── */
const OrdersPage = ({ navigate }) => {
  const [phone, setPhone] = useState("");
  const [orders, setOrders] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = async () => {
    if(!/^01[0-9]{9}$/.test(phone)) return;
    setLoading(true);
    try {
      const data = await sb(`orders?phone=eq.${phone}&order=date.desc`);
      setOrders(data || []);
    } catch { setOrders([]); }
    setSearched(true);
    setLoading(false);
  };

  return (
    <div className="orders-page">
      <button onClick={()=>navigate("home")} style={{border:0,background:"none",color:"var(--brand)",cursor:"pointer",fontFamily:"var(--f-ar)",fontSize:"0.88rem",marginBottom:20,display:"flex",alignItems:"center",gap:6}}>
        <Icon name="back" size={16}/> العودة للرئيسية
      </button>
      <h1 style={{margin:"0 0 8px",fontSize:"1.8rem",fontWeight:900}}>طلباتي</h1>
      <p style={{color:"var(--ink-3)",marginBottom:32}}>أدخل رقم هاتفك لعرض جميع طلباتك</p>
      <div style={{display:"flex",gap:10,marginBottom:32,maxWidth:440}}>
        <input className="form-input" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="01XXXXXXXXX" dir="ltr"
          onKeyDown={e=>e.key==="Enter"&&search()} style={{flex:1}}/>
        <button className="btn btn-primary" style={{border:0,whiteSpace:"nowrap"}} onClick={search} disabled={loading}>
          {loading?"جاري البحث…":"بحث"}
        </button>
      </div>
      {searched && orders !== null && (
        orders.length===0
          ? <div style={{textAlign:"center",padding:"40px 0",color:"var(--ink-3)"}}><Icon name="cart" size={40}/><p style={{marginTop:12}}>لا توجد طلبات لهذا الرقم.</p></div>
          : <div>
              {orders.map(order => {
                const st = STATUS_MAP[order.status] || { ar:order.status, color:"#888" };
                const items = Array.isArray(order.products) ? order.products : [];
                return (
                  <div key={order.id} className="order-card">
                    <div className="order-card-head">
                      <div>
                        <span className="order-code">{order.code}</span>
                        <div style={{fontSize:"0.78rem",color:"var(--ink-3)",marginTop:3}}>{order.date}</div>
                      </div>
                      <span className="order-status" style={{background:`${st.color}20`,color:st.color}}>{st.ar}</span>
                    </div>
                    <div className="order-items-list">
                      {items.map((it,i) => (
                        <div key={i} className="order-item-row">
                          <div className="order-item-img"><PP stripe={i%6} label={it.name} sku={it.code}/></div>
                          <div style={{flex:1}}><div style={{fontWeight:600}}>{it.name}</div><div style={{fontSize:"0.78rem",color:"var(--ink-3)"}}>× {it.qty}</div></div>
                          <div style={{fontWeight:700,fontFamily:"var(--f-mono)",fontSize:"0.88rem"}}>{fmtEGP(it.price*it.qty)} ج.م</div>
                        </div>
                      ))}
                    </div>
                    <div className="order-footer">
                      <div style={{fontSize:"0.85rem",color:"var(--ink-3)"}}>الإجمالي</div>
                      <div style={{fontWeight:900,fontSize:"1.1rem",fontFamily:"var(--f-mono)",color:"var(--brand)"}}>{fmtEGP(order.total)} ج.م</div>
                    </div>
                    {order.status==="Shipped" && (
                      <button className="btn btn-ghost btn-block sm" style={{marginTop:12}} onClick={()=>window.open("https://bosta.co/en-eg/tracking-shipments","_blank")}>
                        <Icon name="truck" size={14}/> تتبع الشحنة
                      </button>
                    )}
                    {order.status==="Cancelled" && order.cancel_reason && (
                      <div style={{marginTop:10,fontSize:"0.8rem",color:"var(--red)",background:"#fff0f0",padding:"8px 12px",borderRadius:"var(--radius)"}}>
                        سبب الإلغاء: {order.cancel_reason}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
      )}
    </div>
  );
};

/* ─── Info pages ─────────────────────────────────────────────────────────── */
const INFO_PAGES = {
  loyalty: {
    title: "بطاقة الولاء",
    icon: "🎁",
    content: (
      <>
        <div className="info-highlight">مع كل طلب من بروتيك، هتلاقي <b>بطاقتين خصم</b> جوه الطرد.</div>
        <div className="info-section">
          <h2>بطاقة لك — خصم ١٠٠ ج.م</h2>
          <p>البطاقة الأولى ليك أنت — استخدمها في أي طلب تاني وتوفر ١٠٠ جنيه تلقائياً. كل اللي عليك تبعتها معانا على واتساب وقت الطلب.</p>
        </div>
        <div className="info-section">
          <h2>بطاقة هدية لصاحبك — خصم ١٠٠ ج.م</h2>
          <p>البطاقة التانية هدية لأي حد تانيه — صاحبك، أخوك، زميلك في الشغل. مش لنفسك. يقدر يستخدمها في أول طلب له ويوفر ١٠٠ جنيه.</p>
        </div>
        <div className="info-section">
          <h2>إزاي تستخدم البطاقة؟</h2>
          <ul>
            <li>ابعت صورة البطاقة على واتساب وقت الطلب.</li>
            <li>البطاقة صالحة لمرة واحدة بس.</li>
            <li>الخصم مش بينضاف على عروض تانية.</li>
            <li>البطاقة شخصية — مش ينفع تستخدمها أنت وصاحبك في نفس الطلب.</li>
          </ul>
        </div>
        <div style={{background:"var(--brand-soft)",border:"1.5px solid var(--brand)",borderRadius:"var(--radius-md)",padding:"20px",marginTop:8}}>
          <div style={{fontWeight:800,fontSize:"0.95rem",marginBottom:8}}>🎯 ليه بطاقة الولاء؟</div>
          <p style={{margin:0,fontSize:"0.88rem",color:"var(--ink-2)",lineHeight:1.7}}>
            بروتيك مش بس متجر — ده مجتمع محترفين وصنايعية. البطاقة دي طريقتنا نكافي ثقتك فينا ونوصل لناس أكتر بمساعدتك.
          </p>
        </div>
      </>
    )
  },
  shipping: {
    title: "الشحن والتوصيل",
    icon: "🚚",
    content: (
      <>
        <div className="info-highlight">نوصّل لجميع محافظات مصر خلال <b>٣ إلى ٤ أيام عمل</b> من تأكيد الطلب.</div>
        <div className="info-section">
          <h2>تكلفة الشحن</h2>
          <p>الشحن مجاني على الطلبات التي تتجاوز <b>٥٠٠٠ ج.م</b>. وللطلبات الأقل يُحسب سعر الشحن حسب المحافظة عند إتمام الطلب.</p>
        </div>
        <div className="info-section">
          <h2>شريك التوصيل</h2>
          <p>نعمل مع شركة <b>Bosta</b> للشحن. يمكنك تتبع شحنتك من خلال الرابط: <a href="https://bosta.co/en-eg/tracking-shipments" target="_blank" rel="noreferrer" style={{color:"var(--brand)"}}>bosta.co</a></p>
        </div>
        <div className="info-section">
          <h2>ملاحظات التوصيل</h2>
          <ul>
            <li>سيتواصل معك مندوب التوصيل قبل الوصول.</li>
            <li>في حالة غيابك وقت التوصيل، يحاول المندوب مرتين قبل إعادة الطلب.</li>
            <li>يرجى التأكد من صحة العنوان ورقم الهاتف عند الطلب.</li>
          </ul>
        </div>
      </>
    )
  },
  returns: {
    title: "الاستبدال والاسترجاع",
    icon: "↩️",
    content: (
      <>
        <div className="info-highlight">يحق للعميل استبدال أو إرجاع المنتج خلال <b>٧ أيام</b> من تاريخ الاستلام.</div>
        <div className="info-section">
          <h2>شروط الإرجاع</h2>
          <ul>
            <li>أن يكون المنتج في حالته الأصلية غير مستخدم.</li>
            <li>أن يكون معه الفاتورة والتغليف الأصلي.</li>
            <li>لا يُقبل الإرجاع في حالة المنتجات التالفة بسبب سوء الاستخدام.</li>
          </ul>
        </div>
        <div className="info-section">
          <h2>كيفية الإرجاع</h2>
          <p>للتواصل بخصوص الإرجاع أو الاستبدال، راسلنا على واتساب: <a href="https://wa.me/201091011380" target="_blank" rel="noreferrer" style={{color:"var(--brand)"}}>٠١٠٩١٠١١٣٨٠</a></p>
        </div>
      </>
    )
  },
  warranty: {
    title: "ضمان الأدوات",
    icon: "🔧",
    content: (
      <>
        <div className="info-highlight">جميع منتجات بروتيك <b>أصلية ١٠٠٪</b> وتحمل ضمان الوكيل الرسمي.</div>
        <div className="info-section">
          <h2>مدة الضمان</h2>
          <ul>
            <li><b>Total:</b> ضمان ٦ أشهر على العيوب الصناعية فقط.</li>
            <li><b>Wadfow:</b> ضمان ٦ أشهر على العيوب الصناعية فقط.</li>
          </ul>
        </div>
        <div className="info-section">
          <h2>ما لا يشمله الضمان</h2>
          <ul>
            <li>التلف الناتج عن سوء الاستخدام أو الحوادث.</li>
            <li>الاستخدام في ظروف غير مناسبة للمنتج.</li>
            <li>التعديلات أو الإصلاحات من جهات غير معتمدة.</li>
          </ul>
        </div>
        <div className="info-section">
          <h2>تفعيل الضمان</h2>
          <p>لتفعيل الضمان، احتفظ بالفاتورة وتواصل معنا عبر واتساب على <a href="https://wa.me/201091011380" target="_blank" rel="noreferrer" style={{color:"var(--brand)"}}>٠١٠٩١٠١١٣٨٠</a></p>
        </div>
      </>
    )
  },
  privacy: {
    title: "سياسة الخصوصية",
    icon: "🔒",
    content: (
      <>
        <div className="info-section"><h2>البيانات التي نجمعها</h2><p>نجمع فقط البيانات الضرورية لإتمام طلبك: الاسم، رقم الهاتف، والعنوان.</p></div>
        <div className="info-section"><h2>كيف نستخدم بياناتك</h2><ul><li>تأكيد الطلبات والتواصل معك بشأنها.</li><li>تنسيق عملية التوصيل مع شركة الشحن.</li><li>إرسال عروض وتخفيضات إذا وافقت على ذلك.</li></ul></div>
        <div className="info-section"><h2>مشاركة البيانات</h2><p>لا نشارك بياناتك مع أي طرف ثالث خارج نطاق خدمة التوصيل. بياناتك محمية ومحفوظة بشكل آمن.</p></div>
        <div className="info-section"><h2>موافقتك</h2><p>بإتمام طلبك على موقعنا، فأنت توافق على سياسة الخصوصية هذه.</p></div>
      </>
    )
  },
  terms: {
    title: "الشروط والأحكام",
    icon: "📄",
    content: (
      <>
        <div className="info-section"><h2>عن بروتيك</h2><p>بروتيك هي المتجر الإلكتروني الرسمي للوكيل المعتمد لماركات Total و Wadfow في مصر.</p></div>
        <div className="info-section"><h2>الأسعار</h2><p>الأسعار المعروضة بالجنيه المصري وقابلة للتغيير دون إشعار مسبق. السعر المعتمد هو السعر وقت تأكيد الطلب.</p></div>
        <div className="info-section"><h2>تأكيد الطلب</h2><p>يُعتبر الطلب مؤكداً بعد التواصل الهاتفي أو عبر الواتساب من فريق بروتيك.</p></div>
        <div className="info-section"><h2>استخدام الموقع</h2><p>باستخدامك لهذا الموقع فأنت توافق على هذه الشروط والأحكام. يحق لبروتيك تعديل هذه الشروط في أي وقت.</p></div>
      </>
    )
  },
};

const InfoPage = ({ pageKey, navigate }) => {
  const page = INFO_PAGES[pageKey];
  if(!page) return null;
  return (
    <div className="info-page">
      <button onClick={()=>navigate("home")} style={{border:0,background:"none",color:"var(--brand)",cursor:"pointer",fontFamily:"var(--f-ar)",fontSize:"0.85rem",marginBottom:20,display:"flex",alignItems:"center",gap:6}}>
        <Icon name="back" size={15}/> العودة للرئيسية
      </button>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:8}}>
        <span style={{fontSize:32}}>{page.icon}</span>
        <h1>{page.title}</h1>
      </div>
      <div className="info-sub">آخر تحديث: أبريل ٢٠٢٦ • بروتيك للأدوات المهنية</div>
      {page.content}
      <div style={{background:"var(--brand-soft)",borderRadius:"var(--radius-md)",padding:"20px 24px",marginTop:32,display:"flex",alignItems:"center",gap:14}}>
        <Icon name="chat" size={24}/>
        <div>
          <div style={{fontWeight:700,marginBottom:4}}>هل تحتاج مساعدة؟</div>
          <p style={{margin:0,fontSize:"0.88rem",color:"var(--ink-2)"}}>تواصل معنا عبر واتساب على <a href="https://wa.me/201091011380" target="_blank" rel="noreferrer" style={{color:"var(--brand)",fontWeight:700}}>٠١٠٩١٠١١٣٨٠</a> — متاحون ٢٤/٧</p>
        </div>
      </div>
    </div>
  );
};

/* ─── Coming Soon ────────────────────────────────────────────────────────── */
const ComingSoon = ({ settings, logoSrc }) => {
  const cs = settings.coming_soon?.value || {};
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const handleSubmit = async () => {
    if(!email||!/\S+@\S+\.\S+/.test(email)) return;
    try { await sb("waitlist",{method:"POST",prefer:"return=minimal",body:JSON.stringify({email})}); } catch {}
    setSubmitted(true);
  };
  return (
    <div className="cs-wrap">
      {cs.background_image && <div className="cs-bg-img" style={{backgroundImage:`url(${cs.background_image})`}}/>}
      <div className="cs-bg"/><div className="cs-rule"/>
      <div style={{position:"relative",zIndex:1,display:"flex",flexDirection:"column",alignItems:"center",maxWidth:560,width:"100%"}}>
        {logoSrc && <div className="cs-logo"><img src={logoSrc} alt="Protech" style={{width:"100%",height:"100%",objectFit:"contain"}}/></div>}
        <h1 className="cs-title">{cs.headline || <><span>قريباً</span> — بروتيك أونلاين</>}</h1>
        <p className="cs-sub">{cs.subline || "متجرنا الإلكتروني في الطريق إليك. سجّل بريدك لتكون أول من يعرف."}</p>
        {!submitted
          ? <div className="cs-form"><input value={email} onChange={e=>setEmail(e.target.value)} placeholder="بريدك الإلكتروني" onKeyDown={e=>e.key==="Enter"&&handleSubmit()}/><button onClick={handleSubmit}>أبلغني عند الإطلاق</button></div>
          : <div style={{padding:"14px 28px",background:"rgba(47,143,79,.2)",borderRadius:"var(--radius-md)",color:"#6de09a",fontWeight:700,marginBottom:40}}>✓ تم التسجيل! سنبلغك عند الإطلاق.</div>
        }
        <div className="cs-trust">
          {[["🚚","شحن لكل المحافظات"],["🔒","منتجات أصلية ١٠٠٪"],["💬","دعم واتساب ٢٤/٧"]].map(([ic,t])=>(
            <div key={t} className="cs-trust-item"><span>{ic}</span><span>{t}</span></div>
          ))}
        </div>
        <div style={{marginTop:28,color:"rgba(255,255,255,.4)",fontSize:"0.8rem"}}>
          للتواصل: <a href={`https://wa.me/${WHATSAPP_NUMBER}`} style={{color:"var(--brand)"}}>واتساب ٠١٠٩١٠١١٣٨٠</a>
        </div>
      </div>
    </div>
  );
};

/* ─── Toast ──────────────────────────────────────────────────────────────── */
const Toast = ({ msg, type }) => (
  <div className="toast" style={{background:type==="error"?"var(--red)":"var(--green)",color:"#fff"}}>{msg}</div>
);

/* ─── Admin bar ──────────────────────────────────────────────────────────── */
const EditBar = ({ editMode, setEditMode, comingSoon, toggleComingSoon }) => (
  <div className="admin-bar">
    <span style={{color:"var(--brand)",fontWeight:700,letterSpacing:"0.06em",fontFamily:"var(--f-mono)"}}>PROTECH ADMIN</span>
    <span style={{color:"rgba(255,255,255,.3)"}}>|</span>
    <button onClick={()=>setEditMode(!editMode)} style={{background:editMode?"var(--brand)":"rgba(255,255,255,.1)",color:editMode?"#fff":"var(--bg)",border:0,borderRadius:"var(--radius)",padding:"5px 12px",fontFamily:"var(--f-mono)",fontSize:"0.75rem",fontWeight:700,cursor:"pointer"}}>
      {editMode?"✎ وضع التحرير مفعّل":"✎ تعديل صور الموقع"}
    </button>
    <button onClick={toggleComingSoon} style={{background:comingSoon?"#c0392b":"rgba(47,143,79,.3)",color:comingSoon?"#fff":"#6de09a",border:0,borderRadius:"var(--radius)",padding:"5px 12px",fontFamily:"var(--f-mono)",fontSize:"0.75rem",fontWeight:700,cursor:"pointer"}}>
      {comingSoon?"🔴 الموقع مخفي (Coming Soon)":"🟢 الموقع منشور"}
    </button>
    <span style={{color:"rgba(255,255,255,.4)",fontSize:"0.7rem",marginInlineStart:"auto"}}>protech-stores.vercel.app → إدارة المنتجات والطلبات</span>
  </div>
);
/* ─── URL Routing ────────────────────────────────────────────────────────── */
const buildUrl = (p, data) => {
  switch (p) {
    case "home": return "/";
    case "shop": {
      const params = new URLSearchParams();
      if (data?.category) params.set("category", data.category);
      if (data?.search) params.set("search", data.search);
      const qs = params.toString();
      return "/shop" + (qs ? "?" + qs : "");
    }
    case "product": return `/products/${(data?.product?.code || "").toLowerCase()}`;
    case "checkout": return "/checkout";
    case "confirmation": return "/confirmation";
    case "orders": return "/orders";
    case "info": return `/info/${data || ""}`;
    default: return "/";
  }
};

const parseUrl = (pathname, search, products) => {
  if (pathname === "/" || pathname === "") return { page: "home", data: null };
  if (pathname === "/shop") {
    const params = new URLSearchParams(search);
    return { page: "shop", data: { category: params.get("category"), search: params.get("search") } };
  }
  if (pathname.startsWith("/products/")) {
    const code = decodeURIComponent(pathname.split("/products/")[1]);
    const product = products.find(p => (p.code || "").toLowerCase() === code.toLowerCase());
    if (product) return { page: "product", data: { product } };
    return { page: "home", data: null };
  }
  if (pathname === "/checkout") return { page: "checkout", data: null };
  if (pathname === "/confirmation") return { page: "confirmation", data: null };
  if (pathname === "/orders") return { page: "orders", data: null };
  if (pathname.startsWith("/info/")) {
    const key = pathname.split("/info/")[1];
    return { page: "info", data: key };
  }
  return { page: "home", data: null };
};
/* ─── App ────────────────────────────────────────────────────────────────── */
export default function App() {
  const [products, setProducts] = useState([]);
  const [settings, setSettings] = useState({});
  const [logoSrc, setLogoSrc] = useState(null);
  const [dark, setDark] = useState(false);
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [wishlist, setWishlist] = useState([]);
  const [wishlistOpen, setWishlistOpen] = useState(false);
  const [page, setPage] = useState("home");
  const [pageData, setPageData] = useState(null);
  const [toast, setToast] = useState(null);
  const [editMode, setEditMode] = useState(false);

  const toggleWish = (p) => {
    setWishlist(w => w.find(i=>i.id===p.id) ? w.filter(i=>i.id!==p.id) : [...w, p]);
  };
  const wishCount = wishlist.length;
  const isWished = (id) => wishlist.some(i => i.id === id);

  const ADMIN_PASSWORD = "protech2024";
  const [adminUnlocked, setAdminUnlocked] = useState(() => { try { return sessionStorage.getItem("protech_admin_unlocked")==="1"; } catch { return false; } });
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState(false);

 const adminRequested = typeof window !== "undefined" && (
    new URLSearchParams(window.location.search).get("admin")==="1" ||
    localStorage.getItem("protech_admin")==="1"
  );
  const isAdmin = adminUnlocked;

  const handlePasswordSubmit = () => {
    if(passwordInput===ADMIN_PASSWORD) {
      try { sessionStorage.setItem("protech_admin_unlocked","1"); } catch {}
      setAdminUnlocked(true); setPasswordInput("");
    } else { setPasswordError(true); setTimeout(()=>setPasswordError(false),2000); }
  };

  useEffect(() => {
    sb("products?select=*&is_published=eq.true&order=sort_order.asc,id.asc").then(d=>setProducts(d||[])).catch(()=>{});
    sb("site_settings?select=*").then(rows=>{ if(!rows) return; const map={}; rows.forEach(r=>{map[r.key]=r;}); setSettings(map); }).catch(()=>{});
    const logo=`${SB_URL}/storage/v1/object/public/protech-media/brand/logo.jpg`;
    fetch(logo,{method:"HEAD"}).then(r=>{ if(r.ok) setLogoSrc(logo); }).catch(()=>{});
  }, []);
  // Parse URL once products are loaded
  useEffect(() => {
    if (!products.length) return;
    const { page: p, data } = parseUrl(window.location.pathname, window.location.search, products);
    setPage(p);
    setPageData(data);
  }, [products]);

  // Handle browser back/forward
  useEffect(() => {
    const onPop = () => {
      if (!products.length) return;
      const { page: p, data } = parseUrl(window.location.pathname, window.location.search, products);
      setPage(p);
      setPageData(data);
      window.scrollTo(0, 0);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [products]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", dark?"dark":"light");
    document.documentElement.setAttribute("dir","rtl");
    document.documentElement.setAttribute("lang","ar");
  }, [dark]);

  const showToast = (msg, type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),2800); };

 const navigate = (p, data=null) => {
    setPage(p); setPageData(data);
    const url = buildUrl(p, data);
    window.history.pushState({ page: p }, "", url);
    window.scrollTo(0,0);
  };

  const updateSettings = (key, value) => setSettings(s=>({...s,[key]:{...(s[key]||{}),value}}));

  const comingSoon = settings.coming_soon?.value?.enabled === false;

  const toggleComingSoon = async () => {
    const current = settings.coming_soon?.value || {};
    const next = { ...current, enabled: !current.enabled };
    await fetch(`${SB_URL}/rest/v1/site_settings?key=eq.coming_soon`, {
      method: "PATCH",
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ value: next }),
    });
    updateSettings("coming_soon", next);
    showToast(next.enabled ? "الموقع الآن في وضع Coming Soon" : "الموقع منشور الآن 🚀");
  };

  const addToCart = (p) => {
    setCart(c=>{ const ex=c.find(i=>i.id===p.id); if(ex) return c.map(i=>i.id===p.id?{...i,qty:i.qty+1}:i); return [...c,{...p,qty:1}]; });
    setCartOpen(true);
    window.fbq?.('track', 'AddToCart', {
      content_ids: [p.id],
      content_name: p.name,
      content_type: 'product',
      value: (p.is_offer && p.offer_price ? p.offer_price : p.price) * (p.qty || 1),
      currency: 'EGP',
    });
    showToast("تمت الإضافة للسلة ✓");
  };
  const inc = id => setCart(c=>c.map(i=>i.id===id?{...i,qty:i.qty+1}:i));
  const dec = id => setCart(c=>c.map(i=>i.id===id?{...i,qty:Math.max(1,i.qty-1)}:i));
  const remove = id => setCart(c=>c.filter(i=>i.id!==id));
  const cartCount = cart.reduce((s,i)=>s+i.qty,0);
  const cartTotal = cart.reduce((s,i)=>s+(i.is_offer&&i.offer_price?i.offer_price:i.price)*i.qty,0);

  const sharedProps = {
    products, onAdd: addToCart, navigate, showToast,
    onWish: toggleWish, isWished,
  };

  if(comingSoon && !isAdmin) return (
    <>
      <style>{CSS}</style>
      <ComingSoon settings={settings} logoSrc={logoSrc}/>
      <div style={{position:"fixed",bottom:20,left:"50%",transform:"translateX(-50%)",background:"#1a1614",border:"1px solid #333",borderRadius:12,padding:"14px 18px",display:"flex",gap:10,alignItems:"center",zIndex:999,boxShadow:"0 8px 32px rgba(0,0,0,.4)",direction:"rtl"}}>
        <input type="password" placeholder="كلمة المرور" value={passwordInput} onChange={e=>setPasswordInput(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&handlePasswordSubmit()}
          style={{background:"#2a2420",border:`1px solid ${passwordError?"#D4352A":"#444"}`,borderRadius:6,padding:"7px 12px",color:"#fff",fontFamily:"Cairo,sans-serif",fontSize:"0.88rem",outline:"none",width:170,transition:"border-color .2s",direction:"rtl"}}/>
        <button onClick={handlePasswordSubmit} style={{background:"#F26A21",color:"#fff",border:0,borderRadius:6,padding:"7px 14px",fontFamily:"Cairo,sans-serif",fontWeight:700,fontSize:"0.85rem",cursor:"pointer"}}>دخول</button>
        {passwordError && <span style={{color:"#D4352A",fontSize:"0.78rem",fontFamily:"Cairo,sans-serif"}}>خاطئة</span>}
      </div>
    </>
  );

  return (
    <>
      <style>{CSS}</style>
      <SiteHeader
        cartCount={cartCount} cartTotal={cartTotal} onCart={()=>{setCartOpen(true);window.fbq?.('track','CustomEvent',{event_name:'ViewCart',num_items:cartCount,value:cartTotal,currency:'EGP'});}}
        dark={dark} setDark={setDark} navigate={navigate} logoSrc={logoSrc}
        wishCount={wishCount} onWishlist={()=>setWishlistOpen(true)}
      />

      {page==="home" && (
        <>
          <HeroA settings={settings} navigate={navigate} onUpdateSettings={updateSettings} showToast={showToast} editMode={editMode}/>
          <OffersSection {...sharedProps}/>
          <TopSellingSection {...sharedProps}/>
          <CategoriesSection products={products} navigate={navigate} settings={settings} onUpdateSettings={updateSettings} showToast={showToast} editMode={editMode}/>
          <DealBanners settings={settings} onUpdateSettings={updateSettings} showToast={showToast} editMode={editMode} navigate={navigate}/>
          {/* Garden Tools Banner */}
          
          
          <CategoryRail catId="battery" num="04a" eyebrow="CORDLESS POWER" title="أدوات البطارية" desc="أحدث موديلات الدريلات والمناشير والمفاتيح اللاسلكية — بطاريات ليثيوم عالية الأداء وضمان الوكيل ٦ أشهر." pinnedCodes={PINNED_BATTERY} {...sharedProps}/>
          <CategoryRail catId="electric" num="04b" eyebrow="CORDED POWER" title="الأدوات الكهربائية" desc="آلات كهربائية للنجارة والحدادة والديكور — قوة مستمرة، أداء احترافي، موثوقية الاستخدام اليومي في الورش والمواقع." pinnedCodes={PINNED_ELECTRIC} {...sharedProps}/>
          <CategoryRail catId="sets" num="04c" eyebrow="TOOL SETS" title="اطقم أدوات وكومبو" desc="طقم نجار، طقم سباك، طقم كهربائي — كل حاجة محتاجها في علبة واحدة بسعر موفر." {...sharedProps}/>
          <Section id="new" num="05" eyebrow="NEW ARRIVALS" title="وصل حديثاً" cta={{label:"عرض كل الجديد",fn:()=>navigate("shop",{category:"new"})}}>
            <div className="cat-carousel">{products.slice(-8).reverse().map(p=><ProductCard key={p.id} p={p} onAdd={addToCart} onNavigate={navigate} onWish={toggleWish} isWished={isWished(p.id)}/>)}</div>
          </Section>
          <ReviewsSection/>
        </>
      )}
      {page==="shop" && <ShopPage {...sharedProps} initialCat={pageData?.category} initialSearch={pageData?.search}/>}
      {page==="product" && pageData?.product && <ProductDetailPage product={pageData.product} onAdd={addToCart} products={products} navigate={navigate} onWish={toggleWish} isWished={isWished}/>}
      {page==="checkout" && <CheckoutPage cart={cart} navigate={navigate} setCart={setCart} products={products} setProducts={setProducts} showToast={showToast}/>}
      {page==="confirmation" && <ConfirmationPage pageData={pageData} navigate={navigate}/>}
      {page==="orders" && <OrdersPage navigate={navigate}/>}
      {page==="info" && <InfoPage pageKey={pageData} navigate={navigate}/>}

      <SiteFooter logoSrc={logoSrc} navigate={navigate}/>

      <CartDrawer open={cartOpen} items={cart} onClose={()=>setCartOpen(false)} onInc={inc} onDec={dec} onRemove={remove} navigate={navigate}/>
      <WishlistDrawer
        open={wishlistOpen}
        items={wishlist}
        onClose={()=>setWishlistOpen(false)}
        onAddToCart={(p)=>{ addToCart(p); showToast("تمت الإضافة للسلة ✓"); }}
        onRemove={toggleWish}
      />

      {isAdmin && <EditBar editMode={editMode} setEditMode={setEditMode} comingSoon={comingSoon} toggleComingSoon={toggleComingSoon}/>}
      {isAdmin && <div style={{height:52}}/>}
      {adminRequested && !adminUnlocked && (
        <div style={{position:"fixed",bottom:20,left:"50%",transform:"translateX(-50%)",background:"#1a1614",border:"1px solid #333",borderRadius:12,padding:"14px 18px",display:"flex",gap:10,alignItems:"center",zIndex:999,boxShadow:"0 8px 32px rgba(0,0,0,.4)",direction:"rtl"}}>
          <input type="password" placeholder="كلمة المرور" value={passwordInput} onChange={e=>setPasswordInput(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&handlePasswordSubmit()}
            style={{background:"#2a2420",border:`1px solid ${passwordError?"#D4352A":"#444"}`,borderRadius:6,padding:"7px 12px",color:"#fff",fontFamily:"Cairo,sans-serif",fontSize:"0.88rem",outline:"none",width:170,transition:"border-color .2s",direction:"rtl"}}/>
          <button onClick={handlePasswordSubmit} style={{background:"#F26A21",color:"#fff",border:0,borderRadius:6,padding:"7px 14px",fontFamily:"Cairo,sans-serif",fontWeight:700,fontSize:"0.85rem",cursor:"pointer"}}>دخول</button>
          {passwordError && <span style={{color:"#D4352A",fontSize:"0.78rem",fontFamily:"Cairo,sans-serif"}}>خاطئة</span>}
        </div>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type}/>}
    </>
  );
}
