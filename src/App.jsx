import { useState, useEffect, useRef, useCallback } from "react";

/* ─── Config ────────────────────────────────────────────────────────────── */
const SB_URL = "https://wljxplbcfoorqpoflcdz.supabase.co";
const SB_KEY = "sb_publishable_zsHh-eOarHI7BSGtuP6WWQ_PQ4ACoHG";

const sb = async (path, opts = {}) => {
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      "Content-Type": "application/json",
      Prefer: opts.prefer || "return=representation",
      ...opts.headers,
    },
    ...opts,
  });
  if (!res.ok) { const t = await res.text(); throw new Error(t); }
  return res.json().catch(() => null);
};

// Upload file to Supabase Storage
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

/* ─── Static fallback category data ─────────────────────────────────────── */
const CATS = [
  { id: "battery",   ar: "أدوات البطارية",  en: "Battery Tools",   icon: "battery" },
  { id: "electric",  ar: "أدوات كهربائية",  en: "Electric Tools",   icon: "bolt" },
  { id: "hand",      ar: "عدد يدوية",       en: "Hand Tools",       icon: "wrench" },
  { id: "measuring", ar: "أدوات قياس",      en: "Measuring Tools",  icon: "ruler" },
  { id: "garden",    ar: "أدوات الحدائق",   en: "Gardening Tools",  icon: "leaf" },
  { id: "car",       ar: "أدوات السيارات",  en: "Car Tools",        icon: "car" },
  { id: "sets",      ar: "طقم أدوات",       en: "Tool Sets",        icon: "case" },
  { id: "safety",    ar: "أدوات السلامة",   en: "Safety Gear",      icon: "helmet" },
];

/* ─── CSS ────────────────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=JetBrains+Mono:wght@500;700&display=swap');
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
  --ink:oklch(0.96 0.005 70);--ink-2:oklch(0.85 0.005 70);--ink-3:oklch(0.68 0.005 70);--mute:oklch(0.55 0.006 70);
  --bg:oklch(0.16 0.008 50);--bg-2:oklch(0.21 0.008 50);--bg-3:oklch(0.26 0.01 50);
  --line:oklch(0.30 0.008 50);--line-2:oklch(0.38 0.008 50);
  --brand-soft:color-mix(in oklch,var(--brand),black 60%);
}
*{box-sizing:border-box;}html,body{margin:0;padding:0;}
body{font-family:var(--f-ar);background:var(--bg);color:var(--ink);direction:rtl;-webkit-font-smoothing:antialiased;}
.wrap{max-width:var(--wrap);margin:0 auto;padding:0 24px;}
a{color:inherit;text-decoration:none;}
button{font-family:inherit;cursor:pointer;border:0;background:none;color:inherit;}
input,select,textarea{font-family:inherit;}
.num{font-family:var(--f-mono);font-size:0.72rem;color:var(--brand);letter-spacing:0.04em;}
.btn{display:inline-flex;align-items:center;gap:8px;padding:12px 20px;border-radius:var(--radius);font-weight:700;font-size:0.92rem;transition:all .15s;border:1.5px solid transparent;white-space:nowrap;}
.btn.lg{padding:16px 28px;font-size:1rem;}.btn.sm{padding:8px 14px;font-size:0.82rem;}
.btn-primary{background:var(--brand);color:#fff;border-color:var(--brand);}.btn-primary:hover{background:var(--brand-ink);border-color:var(--brand-ink);}
.btn-dark{background:var(--ink);color:var(--bg);}.btn-dark:hover{background:#000;}
.btn-ghost{border-color:var(--line-2);color:var(--ink);background:var(--bg);}.btn-ghost:hover{border-color:var(--ink);}
.btn-block{width:100%;justify-content:center;}
.icon-btn{width:32px;height:32px;display:grid;place-items:center;border-radius:var(--radius);border:1px solid var(--line);background:var(--bg);}
.icon-btn:hover{border-color:var(--ink);}

/* TOPBAR */
.site-header{position:sticky;top:0;z-index:40;background:var(--bg);border-bottom:1px solid var(--line);}
.topbar{background:var(--ink);color:color-mix(in oklch,var(--bg),transparent 20%);font-size:0.78rem;}
.topbar-inner{display:flex;justify-content:space-between;align-items:center;height:34px;}
.tb-left,.tb-right{display:flex;align-items:center;gap:14px;}
.tb-item{display:inline-flex;align-items:center;gap:6px;}
.tb-sep{width:1px;height:14px;background:rgba(255,255,255,0.12);}
.tb-btn{display:inline-flex;align-items:center;gap:6px;color:inherit;font-weight:600;font-size:0.78rem;padding:4px 2px;}.tb-btn:hover{color:#fff;}
.tb-link{display:inline-flex;align-items:center;gap:6px;color:var(--brand);font-weight:700;font-family:var(--f-mono);}
.hdr{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:24px;padding:16px 24px;}
.brand{display:inline-flex;align-items:center;gap:12px;background:none;border:0;padding:0;cursor:pointer;}
.brand-mark{width:54px;height:54px;border-radius:6px;overflow:hidden;background:#fff;display:grid;place-items:center;box-shadow:var(--shadow-sm);border:1px solid var(--line);}
.brand-mark img{width:100%;height:100%;object-fit:contain;}
.brand-text b{display:block;font-size:1.2rem;line-height:1;}
.brand-text small{display:block;font-family:var(--f-mono);font-size:0.68rem;color:var(--ink-3);letter-spacing:0.08em;margin-top:4px;}
.search{display:flex;align-items:stretch;border:2px solid var(--ink);border-radius:var(--radius);overflow:hidden;background:var(--bg);height:52px;max-width:760px;}
.search-cat{padding:0 16px;background:var(--bg-2);border-inline-start:1px solid var(--line);display:inline-flex;align-items:center;gap:6px;font-weight:600;font-size:0.88rem;color:var(--ink-2);white-space:nowrap;}.search-cat:hover{background:var(--bg-3);}
.search-input{flex:1;border:0;background:transparent;padding:0 16px;font-size:0.95rem;color:var(--ink);outline:none;}.search-input::placeholder{color:var(--mute);}
.search-btn{background:var(--brand);color:#fff;padding:0 22px;display:inline-flex;align-items:center;gap:8px;font-weight:700;}.search-btn:hover{background:var(--brand-ink);}
.hdr-right{display:flex;gap:8px;}
.hdr-pill{display:inline-flex;align-items:center;gap:10px;padding:10px 14px;border-radius:var(--radius);border:1px solid var(--line);background:var(--bg);position:relative;cursor:pointer;}.hdr-pill:hover{border-color:var(--ink);}
.hdr-pill-t{display:flex;flex-direction:column;align-items:flex-start;line-height:1.1;}
.hdr-pill-t small{font-size:0.68rem;color:var(--ink-3);}.hdr-pill-t b{font-size:0.88rem;}
.hdr-cart-badge{position:absolute;top:-6px;inset-inline-end:-6px;width:20px;height:20px;background:var(--brand);color:#fff;border-radius:50%;display:grid;place-items:center;font-size:0.72rem;font-weight:800;font-family:var(--f-mono);border:2px solid var(--bg);}

/* NAVBAR */
.navbar{border-top:1px solid var(--line);background:var(--bg);position:relative;}
.nav-inner{display:flex;align-items:center;gap:4px;height:46px;}
.nav-all{display:inline-flex;align-items:center;gap:8px;padding:0 14px;height:46px;background:var(--ink);color:var(--bg);font-weight:700;font-size:0.9rem;margin-inline-end:8px;}.nav-all:hover{background:var(--brand);}
.nav-link{padding:0 14px;height:46px;display:inline-flex;align-items:center;gap:6px;font-weight:600;font-size:0.9rem;color:var(--ink-2);position:relative;}.nav-link:hover{color:var(--brand);}
.nav-link.hot{color:var(--brand);}.nav-link.hot::before{content:"";width:6px;height:6px;background:var(--brand);border-radius:50%;}
.nav-link.muted{color:var(--ink-3);}
.nav-spacer{flex:1;}

/* MEGA */
.mega{position:absolute;top:100%;inset-inline-start:0;right:0;width:100%;background:var(--bg);border-top:1px solid var(--line);box-shadow:var(--shadow-md);z-index:30;}
.mega-inner{display:grid;grid-template-columns:320px 1fr;}
.mega-cats{border-inline-end:1px solid var(--line);padding:14px 0;background:var(--bg-2);}
.mega-cat{display:flex;align-items:center;gap:12px;padding:10px 20px;}.mega-cat:hover{background:var(--brand-soft);color:var(--brand-ink);}
.mega-cat-icon{width:36px;height:36px;display:grid;place-items:center;background:var(--bg);border:1px solid var(--line);border-radius:var(--radius);color:var(--brand);}
.mega-cat-text b{display:block;font-size:0.9rem;}.mega-cat-text small{display:block;font-family:var(--f-mono);font-size:0.68rem;color:var(--ink-3);}
.mega-cat-chev{margin-inline-start:auto;opacity:0.4;}.mega-cat:hover .mega-cat-chev{opacity:1;}
.mega-cols{display:grid;grid-template-columns:1fr 1fr 1fr 1.1fr;gap:28px;padding:24px 28px;}
.mega-col h4{margin:0 0 10px;font-size:0.78rem;font-family:var(--f-mono);color:var(--ink-3);letter-spacing:0.06em;text-transform:uppercase;}
.mega-col ul{list-style:none;margin:0;padding:0;}.mega-col li{padding:5px 0;font-size:0.9rem;}.mega-col li a:hover{color:var(--brand);}
.mega-promo{background:var(--ink);color:var(--bg);padding:20px;border-radius:var(--radius-md);display:flex;flex-direction:column;justify-content:center;position:relative;overflow:hidden;}
.mega-promo::after{content:"";position:absolute;inset:0;background:repeating-linear-gradient(135deg,transparent 0 10px,rgba(242,106,33,0.08) 10px 11px);pointer-events:none;}
.mega-promo-tag{font-family:var(--f-mono);font-size:0.72rem;color:var(--brand);letter-spacing:0.1em;text-transform:uppercase;}
.mega-promo-title{font-size:1.15rem;font-weight:800;margin:8px 0 4px;line-height:1.3;}
.mega-promo-sub{font-size:0.82rem;opacity:0.7;margin-bottom:12px;}
.mega-promo-cta{display:inline-flex;align-items:center;gap:6px;color:var(--brand);font-weight:700;font-size:0.88rem;}

/* HERO */
.hero{position:relative;background:var(--bg);}
.hero-a{padding:36px 0 0;border-bottom:1px solid var(--line);}
.hero-grid{display:grid;grid-template-columns:1.1fr 1fr;grid-template-rows:auto auto;gap:24px 32px;padding-bottom:48px;}
.hero-lead{grid-column:1;grid-row:1;display:flex;flex-direction:column;justify-content:center;padding:24px 0;}
.hero-visuals{grid-column:2;grid-row:1;display:grid;grid-template-rows:1fr auto;gap:10px;align-content:center;}
.hv-main{position:relative;border:1px solid var(--line);border-radius:var(--radius-md);overflow:hidden;background:var(--bg-2);}
.hv-badge{position:absolute;top:12px;inset-inline-end:12px;background:var(--ink);color:var(--bg);padding:4px 10px;font-size:0.7rem;font-weight:700;border-radius:var(--radius);z-index:2;font-family:var(--f-mono);}
.hv-thumbs{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.hv-thumb{border:1px solid var(--line);border-radius:var(--radius-md);overflow:hidden;background:var(--bg-2);}
.hero-cats{grid-column:1 / -1;grid-row:2;padding:20px;border:1px solid var(--line);background:var(--bg-2);border-radius:var(--radius-md);}
.hero-cats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;}
.eyebrow{display:inline-flex;align-items:center;gap:10px;font-size:0.82rem;margin-bottom:18px;color:var(--ink-2);}
.eyebrow b{font-weight:700;}.eyebrow small{font-family:var(--f-mono);color:var(--ink-3);letter-spacing:0.06em;}
.hero h1{margin:0;font-size:clamp(2.4rem,5vw,4rem);font-weight:900;line-height:1.05;letter-spacing:-0.01em;}
.hero h1 .hl{color:var(--brand);}
.hero-sub{font-size:1.08rem;color:var(--ink-2);margin:20px 0 28px;max-width:520px;line-height:1.6;}
.hero-ctas{display:flex;gap:10px;flex-wrap:wrap;}
.hero-trust{display:grid;grid-template-columns:repeat(3,auto);gap:32px;margin-top:36px;padding-top:24px;border-top:1px solid var(--line);}
.hero-trust b{display:block;font-size:1.5rem;font-weight:900;}.hero-trust small{display:block;font-size:0.82rem;color:var(--ink-3);margin-top:2px;}
.hero-cats-head{display:flex;align-items:center;gap:10px;margin-bottom:14px;}
.hero-cats-head h3{margin:0;font-size:1rem;font-weight:800;}
.muted-link{margin-inline-start:auto;font-size:0.82rem;color:var(--ink-3);display:inline-flex;align-items:center;gap:4px;}.muted-link:hover{color:var(--brand);}
.mini-cat{display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--bg);border:1px solid var(--line);border-radius:var(--radius);}.mini-cat:hover{border-color:var(--brand);background:var(--brand-soft);}
.mini-cat-icon{width:34px;height:34px;display:grid;place-items:center;color:var(--brand);background:var(--brand-soft);border-radius:var(--radius);}
.mini-cat-text b{display:block;font-size:0.86rem;}.mini-cat-text small{display:block;font-size:0.72rem;color:var(--ink-3);margin-top:2px;}

/* TICKER */
.ticker{border-top:1px solid var(--line);background:var(--bg-2);overflow:hidden;font-family:var(--f-mono);font-size:0.8rem;letter-spacing:0.04em;}
.ticker-track{display:flex;gap:40px;padding:10px 0;white-space:nowrap;animation:slide-rtl 40s linear infinite;}
.ticker-group{display:inline-flex;gap:28px;align-items:center;}
.ticker-group span{display:inline-flex;align-items:center;gap:6px;color:var(--ink-2);}
.ticker-group .dot{color:var(--brand);}
@keyframes slide-rtl{from{transform:translateX(0);}to{transform:translateX(100%);}}

/* SECTIONS */
.section{padding:64px 0;}
.sec-head{display:flex;align-items:baseline;gap:20px;margin-bottom:32px;}
.sec-eyebrow{display:inline-flex;align-items:center;gap:10px;font-size:0.8rem;color:var(--ink-2);}
.sec-title{margin:0;font-size:1.9rem;font-weight:900;letter-spacing:-0.01em;}
.sec-rule{flex:1;height:1px;background:var(--line);}
.sec-cta{font-size:0.9rem;font-weight:700;color:var(--brand);display:inline-flex;align-items:center;gap:4px;}
.rail{display:grid;gap:16px;}
.rail-3{grid-template-columns:repeat(3,1fr);}.rail-4{grid-template-columns:repeat(4,1fr);}
.tabs{display:flex;gap:4px;margin-bottom:20px;padding-bottom:4px;border-bottom:1px solid var(--line);align-items:center;overflow-x:auto;}
.tab{padding:10px 16px;font-size:0.88rem;font-weight:700;color:var(--ink-3);border-bottom:2px solid transparent;margin-bottom:-1px;white-space:nowrap;}.tab:hover{color:var(--ink);}.tab.on{color:var(--ink);border-bottom-color:var(--brand);}
.tabs-spacer{flex:1;}
.tabs-filter{display:inline-flex;align-items:center;gap:6px;padding:8px 12px;border:1px solid var(--line);border-radius:var(--radius);font-size:0.82rem;font-weight:600;color:var(--ink-2);white-space:nowrap;}.tabs-filter:hover{border-color:var(--ink);}

/* CATEGORIES */
.cats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;}
.cat-tile{display:flex;flex-direction:column;background:var(--bg-2);border:1px solid var(--line);border-radius:var(--radius-md);overflow:hidden;transition:all .18s;cursor:pointer;}
.cat-tile:hover{border-color:var(--ink);transform:translateY(-2px);box-shadow:var(--shadow-md);}
.cat-tile:hover .cat-tile-icon{color:var(--bg);background:var(--brand);}
.cat-tile-media{position:relative;aspect-ratio:16/10;overflow:hidden;background:var(--bg-3);}
.cat-tile-stripes{position:absolute;inset:0;background:repeating-linear-gradient(calc(28deg + var(--i,0)*15deg),transparent 0 12px,rgba(0,0,0,0.025) 12px 13px);}
.cat-tile-icon{position:absolute;inset-inline-start:20px;bottom:20px;width:64px;height:64px;display:grid;place-items:center;color:var(--brand);background:var(--bg);border-radius:8px;border:1px solid var(--line);transition:all .18s;z-index:1;}
.cat-tile-body{padding:16px 18px;display:flex;flex-direction:column;gap:8px;border-top:1px solid var(--line);}
.cat-tile-title b{display:block;font-size:1.05rem;}.cat-tile-title small{display:block;font-family:var(--f-mono);font-size:0.72rem;color:var(--ink-3);letter-spacing:0.06em;margin-top:2px;}
.cat-tile-foot{display:flex;justify-content:space-between;align-items:center;color:var(--ink-3);font-size:0.85rem;padding-top:8px;border-top:1px dashed var(--line);}

/* PRODUCT CARD */
.card{background:var(--bg);border:1px solid var(--line);border-radius:var(--radius-md);overflow:hidden;display:flex;flex-direction:column;transition:all .15s;cursor:pointer;}
.card:hover{border-color:var(--ink-3);box-shadow:var(--shadow-md);}
.card-media{position:relative;aspect-ratio:4/3;overflow:hidden;background:var(--bg-2);}
.card-media img{width:100%;height:100%;object-fit:cover;transition:transform .3s;}.card:hover .card-media img{transform:scale(1.04);}
.badge{position:absolute;top:10px;inset-inline-start:10px;background:var(--brand);color:#fff;font-size:0.72rem;font-weight:800;padding:4px 10px;border-radius:var(--radius);font-family:var(--f-mono);z-index:1;}
.wish{position:absolute;top:10px;inset-inline-end:10px;width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,0.9);display:grid;place-items:center;color:var(--ink-2);border:1px solid var(--line);z-index:1;}.wish:hover{color:var(--brand);border-color:var(--brand);}
.card-body{padding:14px 16px;display:flex;flex-direction:column;gap:8px;flex:1;}
.card-sku{display:flex;justify-content:space-between;align-items:center;font-size:0.74rem;}
.sku-mono{font-family:var(--f-mono);color:var(--ink-3);letter-spacing:0.04em;}
.card-rating{display:inline-flex;align-items:center;gap:4px;color:var(--ink-2);}.card-rating b{font-weight:700;}.card-rating span{color:var(--ink-3);}
.card-name{margin:0;font-size:0.98rem;font-weight:700;line-height:1.4;min-height:2.6em;}
.card-price-row{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;}
.card-price{display:inline-flex;align-items:baseline;gap:8px;}
.card-price .cur{font-size:0.76rem;color:var(--ink-3);font-weight:600;}.card-price .amt{font-size:1.3rem;font-weight:900;font-family:var(--f-mono);}.card-price .retail{text-decoration:line-through;color:var(--ink-3);font-size:0.82rem;}
.card-foot{display:flex;justify-content:space-between;align-items:center;border-top:1px dashed var(--line);padding-top:10px;margin-top:auto;}
.card-stock{font-size:0.78rem;color:var(--ink-3);display:inline-flex;align-items:center;gap:6px;}
.dot-green{width:6px;height:6px;background:var(--green);border-radius:50%;display:inline-block;}
.add{display:inline-flex;align-items:center;gap:6px;padding:8px 12px;background:var(--ink);color:var(--bg);border-radius:var(--radius);font-size:0.82rem;font-weight:700;transition:all .15s;border:0;}.add:hover{background:var(--brand);color:#fff;}

/* PLACEHOLDER (when no image) */
.pp{position:relative;width:100%;height:100%;overflow:hidden;}
.pp-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(0,0,0,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,0.04) 1px,transparent 1px);background-size:24px 24px;}
.pp-label{position:absolute;inset-inline-start:12px;bottom:12px;background:var(--ink);color:var(--bg);padding:6px 10px;border-radius:var(--radius);font-family:var(--f-mono);font-size:0.7rem;max-width:80%;}
.pp-sku{display:block;color:var(--brand);letter-spacing:0.04em;font-size:0.62rem;}.pp-name{display:block;font-weight:600;letter-spacing:0;margin-top:2px;font-family:var(--f-ar);}
.pp-corner{position:absolute;width:14px;height:14px;border-color:var(--ink);border-style:solid;border-width:0;opacity:0.35;}
.pp-corner.tl{top:6px;inset-inline-start:6px;border-top-width:2px;border-inline-start-width:2px;}
.pp-corner.tr{top:6px;inset-inline-end:6px;border-top-width:2px;border-inline-end-width:2px;}
.pp-corner.bl{bottom:6px;inset-inline-start:6px;border-bottom-width:2px;border-inline-start-width:2px;}
.pp-corner.br{bottom:6px;inset-inline-end:6px;border-bottom-width:2px;border-inline-end-width:2px;}

/* SITE IMAGE (with edit overlay) */
.site-img{position:relative;width:100%;height:100%;}
.site-img img{width:100%;height:100%;object-fit:cover;}
.site-img-edit{position:absolute;inset:0;background:rgba(0,0,0,.55);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;opacity:0;transition:opacity .2s;cursor:pointer;}
.site-img:hover .site-img-edit{opacity:1;}
.site-img-edit span{color:#fff;font-size:0.82rem;font-weight:700;}
.site-img-edit svg{color:#fff;}

/* BANNERS */
.banners-wrap{padding:0 24px;max-width:var(--wrap);margin:0 auto;}
.banners{display:grid;grid-template-columns:1.2fr 1fr 1fr;gap:16px;}
.bnr{position:relative;border-radius:var(--radius-md);overflow:hidden;display:flex;flex-direction:column;justify-content:flex-start;min-height:220px;transition:transform .2s;}.bnr:hover{transform:translateY(-3px);}
.bnr-inner{position:relative;z-index:1;padding:36px 28px;display:flex;flex-direction:column;height:100%;}
.bnr-bg{position:absolute;inset:0;background-size:cover;background-position:center;}
.bnr-bg-overlay{position:absolute;inset:0;}
.bnr-1 .bnr-bg-overlay{background:rgba(30,22,18,.80);}
.bnr-2 .bnr-bg-overlay{background:color-mix(in oklch,var(--brand),.75 black 0.25);}
.bnr-3 .bnr-bg-overlay{background:rgba(245,240,235,.88);}
.bnr-1{background:var(--ink);color:var(--bg);}
.bnr-2{background:var(--brand);color:#fff;}
.bnr-3{background:var(--bg-3);color:var(--ink);border:1px solid var(--line);}
.bnr h3{margin:12px 0;font-size:1.6rem;line-height:1.15;}.bnr p{margin:0 0 14px;font-size:0.95rem;opacity:0.8;}
.bnr-tag{font-family:var(--f-mono);font-size:0.76rem;letter-spacing:0.08em;text-transform:uppercase;font-weight:700;}
.bnr-1 .bnr-tag{color:var(--brand);}.bnr-2 .bnr-tag{color:rgba(255,255,255,.7);}.bnr-3 .bnr-tag{color:var(--brand);}
.bnr-cta{display:inline-flex;align-items:center;gap:6px;font-weight:700;margin-top:auto;}
.bnr-1 .bnr-cta{color:var(--brand);}.bnr-2 .bnr-cta{color:#fff;}.bnr-3 .bnr-cta{color:var(--brand);}
.bnr-stripes{position:absolute;inset:0;background:repeating-linear-gradient(135deg,transparent 0 18px,rgba(255,255,255,0.05) 18px 19px);pointer-events:none;z-index:0;}

/* CAT RAIL */
.cat-rail{background:var(--bg-2);border-top:1px solid var(--line);border-bottom:1px solid var(--line);}
.rail-hero{display:grid;grid-template-columns:1fr 2.5fr;gap:24px;align-items:stretch;}
.rail-hero-text{background:var(--ink);color:var(--bg);padding:36px;border-radius:var(--radius-md);display:flex;flex-direction:column;justify-content:center;position:relative;overflow:hidden;}
.rail-hero-text::before{content:"";position:absolute;top:0;inset-inline-start:0;width:6px;height:100%;background:var(--brand);}
.rail-hero-text .sec-title{margin:8px 0 12px;font-size:1.6rem;color:var(--bg);}
.rail-hero-text .sec-eyebrow{color:color-mix(in oklch,var(--bg),transparent 30%);}
.rail-desc{color:color-mix(in oklch,var(--bg),transparent 30%);font-size:0.92rem;line-height:1.6;margin:0 0 20px;}
.rail-stat{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:28px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.1);}
.rail-stat b{display:block;font-size:1.3rem;font-weight:900;color:var(--brand);font-family:var(--f-mono);}
.rail-stat small{display:block;font-size:0.72rem;color:color-mix(in oklch,var(--bg),transparent 40%);margin-top:2px;}
.rail-items{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;}

/* BRANDS */
.brands-grid{display:grid;grid-template-columns:repeat(8,1fr);gap:0;border:1px solid var(--line);border-radius:var(--radius-md);overflow:hidden;background:var(--bg);}
.brand-tile{position:relative;padding:28px 14px;display:grid;place-items:center;border-inline-end:1px solid var(--line);border-bottom:1px solid var(--line);transition:background .15s;}
.brand-tile:nth-child(8n){border-inline-end:0;}.brand-tile:hover{background:var(--bg-2);}
.brand-logo{font-family:var(--f-mono);font-weight:900;font-size:1.2rem;letter-spacing:0.04em;color:var(--ink-2);}.brand-tile:hover .brand-logo{color:var(--brand);}
.brand-tag{position:absolute;top:8px;inset-inline-start:8px;background:var(--brand);color:#fff;padding:2px 6px;border-radius:2px;font-size:0.62rem;font-family:var(--f-mono);font-weight:700;}

/* REVIEWS */
.reviews-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:32px;}
.review{background:var(--bg);border:1px solid var(--line);padding:24px;border-radius:var(--radius-md);display:flex;flex-direction:column;gap:14px;}
.review-head{display:flex;justify-content:space-between;align-items:center;}
.review-verified{font-size:0.74rem;color:var(--green);display:inline-flex;align-items:center;gap:4px;font-weight:700;}
.review-text{font-size:0.95rem;line-height:1.65;color:var(--ink-2);margin:0;flex:1;}
.review-foot{display:flex;align-items:center;gap:10px;padding-top:12px;border-top:1px solid var(--line);}
.review-avatar{width:38px;height:38px;border-radius:50%;background:var(--brand-soft);color:var(--brand-ink);display:grid;place-items:center;font-weight:800;}
.review-foot b{display:block;font-size:0.88rem;}.review-foot small{display:block;font-size:0.74rem;color:var(--ink-3);}
.reviews-strip{display:grid;grid-template-columns:1fr auto 1fr auto 1fr auto 1fr;gap:24px;align-items:center;padding:24px 32px;background:var(--ink);color:var(--bg);border-radius:var(--radius-md);}
.reviews-strip b{display:block;font-size:1.6rem;font-weight:900;font-family:var(--f-mono);color:var(--brand);}
.reviews-strip small{display:block;font-size:0.82rem;color:color-mix(in oklch,var(--bg),transparent 40%);margin-top:4px;}
.reviews-strip .vr{width:1px;height:40px;background:rgba(255,255,255,0.15);}

/* FOOTER */
.site-footer{background:var(--ink);color:color-mix(in oklch,var(--bg),transparent 30%);margin-top:48px;}
.foot-top{display:grid;grid-template-columns:1.5fr 1fr 1fr 1fr 1.4fr;gap:32px;padding:56px 24px;}
.foot-brand p{font-size:0.92rem;line-height:1.7;margin:14px 0;}
.foot-logo{width:70px;height:70px;border-radius:8px;overflow:hidden;background:#fff;}
.foot-logo img{width:100%;height:100%;object-fit:contain;}
.foot-contact{display:flex;gap:20px;font-size:0.82rem;flex-wrap:wrap;}
.foot-contact span{display:inline-flex;align-items:center;gap:6px;}
.foot-col h5{margin:0 0 14px;font-size:0.84rem;font-weight:800;color:var(--bg);letter-spacing:0.02em;}
.foot-col ul{list-style:none;padding:0;margin:0;}.foot-col li{padding:5px 0;font-size:0.88rem;}.foot-col a:hover{color:var(--brand);}
.foot-news .news-row{display:flex;border:1px solid rgba(255,255,255,0.15);border-radius:var(--radius);overflow:hidden;margin-bottom:8px;background:rgba(255,255,255,0.04);}
.foot-news input{flex:1;background:transparent;border:0;padding:10px 14px;color:var(--bg);font-size:0.9rem;outline:none;}
.foot-news input::placeholder{color:color-mix(in oklch,var(--bg),transparent 60%);}
.foot-news button{background:var(--brand);color:#fff;padding:0 16px;}
.foot-news small{font-size:0.78rem;opacity:0.7;display:block;margin-bottom:12px;}
.pay{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px;}
.pay span{font-family:var(--f-mono);font-size:0.68rem;padding:4px 8px;background:rgba(255,255,255,0.06);border-radius:2px;}
.foot-bot{border-top:1px solid rgba(255,255,255,0.08);padding:16px 0;}
.foot-bot-inner{display:flex;justify-content:space-between;font-size:0.82rem;}
.foot-links a{margin:0 8px;}.foot-links a:hover{color:var(--brand);}

/* DRAWER */
.drawer-scrim{position:fixed;inset:0;background:rgba(0,0,0,0.4);opacity:0;pointer-events:none;transition:opacity .2s;z-index:80;}.drawer-scrim.on{opacity:1;pointer-events:auto;}
.drawer{position:fixed;top:0;right:0;width:420px;max-width:92vw;height:100vh;background:var(--bg);z-index:81;display:flex;flex-direction:column;transform:translateX(105%);transition:transform .28s cubic-bezier(.4,0,.2,1);box-shadow:-4px 0 24px rgba(0,0,0,.12);}.drawer.on{transform:translateX(0);}
.drawer-head{display:flex;justify-content:space-between;align-items:center;padding:20px 24px;border-bottom:1px solid var(--line);}
.drawer-head b{display:block;font-size:1.1rem;}.drawer-head small{color:var(--ink-3);font-size:0.82rem;}
.drawer-body{flex:1;overflow-y:auto;padding:16px 20px;display:flex;flex-direction:column;gap:14px;}
.drawer-item{display:grid;grid-template-columns:80px 1fr;gap:14px;padding:14px;border:1px solid var(--line);border-radius:var(--radius);}
.drawer-media{width:80px;height:80px;border-radius:var(--radius);overflow:hidden;}
.drawer-meta{display:flex;flex-direction:column;gap:4px;}
.drawer-sku{font-family:var(--f-mono);font-size:0.7rem;color:var(--ink-3);}
.drawer-name{font-size:0.92rem;font-weight:700;line-height:1.3;}
.drawer-price{display:flex;align-items:baseline;gap:8px;}
.drawer-price .amt{font-weight:800;font-family:var(--f-mono);}
.drawer-actions{display:flex;justify-content:space-between;align-items:center;margin-top:4px;}
.qty{display:inline-flex;align-items:center;border:1px solid var(--line);border-radius:var(--radius);overflow:hidden;}
.qty button{width:26px;height:26px;display:grid;place-items:center;background:var(--bg-2);color:var(--ink-2);}.qty button:hover{background:var(--bg-3);}
.qty span{padding:0 12px;font-weight:700;font-family:var(--f-mono);font-size:0.88rem;}
.drawer-del{display:inline-flex;align-items:center;gap:4px;font-size:0.78rem;color:var(--ink-3);}.drawer-del:hover{color:var(--red);}
.drawer-foot{border-top:1px solid var(--line);padding:20px 24px;display:flex;flex-direction:column;gap:8px;background:var(--bg-2);}
.drawer-row{display:flex;justify-content:space-between;font-size:0.92rem;}.drawer-row b{font-weight:800;}
.drawer-row.green{color:var(--green);}
.drawer-row.total{font-size:1.1rem;padding-top:8px;border-top:1px solid var(--line);margin-top:4px;}.drawer-row.total b{font-size:1.3rem;font-family:var(--f-mono);}
.drawer-note{font-size:0.76rem;color:var(--ink-3);display:inline-flex;align-items:center;gap:4px;margin-top:6px;justify-content:center;}
.drawer-empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:40px;text-align:center;}
.empty-icon{width:80px;height:80px;border-radius:50%;background:var(--bg-2);display:grid;place-items:center;color:var(--ink-3);}
.drawer-empty b{font-size:1.1rem;}.drawer-empty p{color:var(--ink-3);margin:0 0 8px;}

/* PRODUCT DETAIL */
.product-detail{max-width:1200px;margin:0 auto;padding:40px 24px;}
.product-gallery{display:grid;gap:10px;}
.gallery-main{border:1px solid var(--line);border-radius:var(--radius-md);overflow:hidden;aspect-ratio:4/3;background:var(--bg-2);}
.gallery-main img{width:100%;height:100%;object-fit:cover;}
.gallery-thumbs{display:flex;gap:8px;flex-wrap:wrap;}
.gallery-thumb{width:72px;height:72px;border:2px solid var(--line);border-radius:var(--radius);overflow:hidden;cursor:pointer;background:var(--bg-2);}.gallery-thumb.on{border-color:var(--brand);}
.gallery-thumb img{width:100%;height:100%;object-fit:cover;}
.product-info{display:flex;flex-direction:column;gap:16px;}
.product-grid{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-bottom:48px;}
.qty-row{display:flex;align-items:center;gap:16px;}
.qty-ctrl{display:inline-flex;align-items:center;border:2px solid var(--line);border-radius:var(--radius);overflow:hidden;}
.qty-ctrl button{width:44px;height:44px;display:grid;place-items:center;background:var(--bg-2);font-size:18px;}.qty-ctrl button:hover{background:var(--bg-3);}
.qty-ctrl span{min-width:50px;text-align:center;font-weight:800;font-size:1.1rem;}

/* CHECKOUT */
.checkout-wrap{max-width:1000px;margin:0 auto;padding:48px 24px;}
.checkout-grid{display:grid;grid-template-columns:1fr 380px;gap:32px;align-items:start;}
.checkout-section{background:var(--bg);border:1px solid var(--line);border-radius:var(--radius-md);padding:28px;margin-bottom:20px;}
.checkout-section h3{margin:0 0 20px;font-size:1.1rem;font-weight:800;display:flex;align-items:center;gap:10px;}
.step-num{width:28px;height:28px;border-radius:50%;background:var(--brand);color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:0.82rem;font-weight:800;flex-shrink:0;}
.form-row{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
.form-group{display:flex;flex-direction:column;gap:6px;margin-bottom:16px;}
.form-group label{font-size:0.84rem;font-weight:700;}
.form-input{padding:12px 14px;border:1.5px solid var(--line);border-radius:var(--radius);font-family:var(--f-ar);font-size:0.95rem;color:var(--ink);background:var(--bg);outline:none;transition:border-color .15s;}.form-input:focus{border-color:var(--brand);}.form-input.err{border-color:var(--red);}
.form-err{font-size:0.76rem;color:var(--red);}
.payment-option{display:flex;align-items:center;gap:14px;padding:16px;border:1.5px solid var(--brand);border-radius:var(--radius);background:var(--brand-soft);}
.order-summary{background:var(--bg);border:1px solid var(--line);border-radius:var(--radius-md);padding:24px;position:sticky;top:120px;}
.order-summary h3{margin:0 0 20px;font-size:1.05rem;font-weight:800;}
.summary-items{max-height:280px;overflow-y:auto;margin-bottom:20px;display:flex;flex-direction:column;gap:14px;}
.summary-item{display:flex;gap:12px;align-items:center;}
.summary-item-img{width:52px;height:52px;border-radius:var(--radius);overflow:hidden;flex-shrink:0;background:var(--bg-2);}
.summary-item-img img{width:100%;height:100%;object-fit:cover;}
.summary-item-name{font-size:0.88rem;font-weight:600;flex:1;line-height:1.3;}
.summary-item-qty{font-size:0.78rem;color:var(--ink-3);}
.summary-item-price{font-weight:800;font-family:var(--f-mono);font-size:0.9rem;white-space:nowrap;}
.summary-divider{height:1px;background:var(--line);margin:12px 0;}
.summary-row{display:flex;justify-content:space-between;font-size:0.9rem;margin-bottom:8px;}.summary-row b{font-weight:700;}
.summary-total{display:flex;justify-content:space-between;font-size:1.1rem;padding-top:12px;border-top:2px solid var(--line);margin-top:4px;}.summary-total b{font-weight:900;}.summary-total .amt{font-size:1.4rem;font-weight:900;font-family:var(--f-mono);color:var(--brand);}

/* CONFIRMATION */
.confirm-wrap{max-width:600px;margin:60px auto;padding:0 24px;text-align:center;}
.confirm-card{background:var(--bg);border:1px solid var(--line);border-radius:var(--radius-md);padding:48px 36px;box-shadow:var(--shadow-md);}
.confirm-icon{width:72px;height:72px;border-radius:50%;background:color-mix(in oklch,var(--green),white 80%);display:flex;align-items:center;justify-content:center;margin:0 auto 24px;color:var(--green);}
.confirm-code{font-family:var(--f-mono);font-size:1.6rem;font-weight:900;color:var(--brand);letter-spacing:0.1em;margin:8px 0 24px;}
.confirm-meta{background:var(--bg-2);border-radius:var(--radius);padding:20px;margin-bottom:28px;text-align:right;}
.confirm-meta-row{display:flex;justify-content:space-between;font-size:0.9rem;padding:6px 0;border-bottom:1px solid var(--line);}.confirm-meta-row:last-child{border-bottom:0;}.confirm-meta-row b{font-weight:700;}

/* COMING SOON */
.cs-wrap{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 24px;text-align:center;position:relative;overflow:hidden;background:var(--ink);}
.cs-bg{position:absolute;inset:0;background:repeating-linear-gradient(135deg,transparent 0 40px,rgba(255,255,255,.015) 40px 41px);}
.cs-rule{position:absolute;top:0;left:0;right:0;height:6px;background:var(--brand);}
.cs-logo{width:90px;height:90px;border-radius:12px;overflow:hidden;background:#fff;margin:0 auto 32px;}
.cs-logo img{width:100%;height:100%;object-fit:contain;}
.cs-logo-text{font-size:2rem;font-weight:900;color:#fff;margin-bottom:4px;}
.cs-logo-text span{color:var(--brand);}
.cs-title{font-size:clamp(2rem,6vw,4rem);font-weight:900;color:#fff;line-height:1.1;margin:0 0 16px;}
.cs-title span{color:var(--brand);}
.cs-sub{font-size:1.1rem;color:rgba(255,255,255,.65);max-width:480px;margin:0 auto 40px;line-height:1.6;}
.cs-form{display:flex;gap:0;border-radius:var(--radius);overflow:hidden;max-width:440px;width:100%;margin:0 auto 48px;border:1.5px solid rgba(255,255,255,.15);}
.cs-form input{flex:1;background:rgba(255,255,255,.06);border:0;padding:14px 18px;color:#fff;font-family:var(--f-ar);font-size:0.95rem;outline:none;}
.cs-form input::placeholder{color:rgba(255,255,255,.4);}
.cs-form button{background:var(--brand);color:#fff;padding:14px 22px;font-family:var(--f-ar);font-weight:700;font-size:0.95rem;border:0;white-space:nowrap;cursor:pointer;}
.cs-form button:hover{background:var(--brand-ink);}
.cs-trust{display:flex;gap:32px;justify-content:center;flex-wrap:wrap;}
.cs-trust-item{display:flex;align-items:center;gap:8px;color:rgba(255,255,255,.6);font-size:0.88rem;}
.cs-bg-img{position:absolute;inset:0;background-size:cover;background-position:center;opacity:.12;}

/* IMAGE UPLOAD WIDGET */
.img-upload-zone{border:2px dashed var(--line-2);border-radius:var(--radius-md);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px;gap:10px;cursor:pointer;transition:all .15s;background:var(--bg-2);}
.img-upload-zone:hover,.img-upload-zone.drag{border-color:var(--brand);background:var(--brand-soft);}
.img-upload-zone.drag{border-style:solid;}
.img-upload-zone span{font-size:0.88rem;color:var(--ink-3);}
.img-upload-zone b{font-size:0.92rem;color:var(--brand);}
.img-thumb-grid{display:flex;flex-wrap:wrap;gap:10px;margin-top:12px;}
.img-thumb{position:relative;width:90px;height:90px;border-radius:var(--radius);overflow:hidden;border:1px solid var(--line);}
.img-thumb img{width:100%;height:100%;object-fit:cover;}
.img-thumb-del{position:absolute;top:3px;inset-inline-end:3px;width:22px;height:22px;border-radius:50%;background:rgba(0,0,0,.7);color:#fff;display:grid;place-items:center;cursor:pointer;font-size:14px;line-height:1;}
.img-thumb.primary::after{content:"رئيسية";position:absolute;bottom:0;left:0;right:0;background:var(--brand);color:#fff;font-size:0.6rem;font-weight:700;text-align:center;padding:2px;font-family:var(--f-ar);}

/* TOAST */
.toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);padding:12px 28px;border-radius:10px;font-weight:600;font-size:15px;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,.2);direction:rtl;white-space:nowrap;pointer-events:none;}

/* RESPONSIVE */
@media(max-width:1100px){
  .rail-3,.rail-4,.rail-items,.cats-grid{grid-template-columns:repeat(2,1fr);}
  .hero-grid{grid-template-columns:1fr;}
  .hero-lead,.hero-visuals,.hero-cats{grid-column:1!important;grid-row:auto!important;}
  .hero-cats-grid{grid-template-columns:repeat(2,1fr);}
  .rail-hero{grid-template-columns:1fr;}
  .banners{grid-template-columns:1fr;}
  .brands-grid{grid-template-columns:repeat(4,1fr);}
  .brand-tile:nth-child(8n){border-inline-end:1px solid var(--line);}
  .brand-tile:nth-child(4n){border-inline-end:0;}
  .reviews-grid{grid-template-columns:1fr;}
  .reviews-strip{grid-template-columns:1fr 1fr;gap:16px;}.reviews-strip .vr{display:none;}
  .foot-top{grid-template-columns:1fr 1fr;}
  .checkout-grid{grid-template-columns:1fr;}
  .form-row{grid-template-columns:1fr;}
  .product-grid{grid-template-columns:1fr;}
}
@media(max-width:700px){
  .hdr{grid-template-columns:auto 1fr;padding:12px 16px;}
  .hdr-right{display:none;}
  .hdr-right-mobile{display:flex;}
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
    case "globe":    return <svg {...p}><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/></svg>;
    case "image":    return <svg {...p}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>;
    case "upload":   return <svg {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>;
    case "trash":    return <svg {...p}><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14"/></svg>;
    case "arrow":    return <svg {...p}><path d="M5 12h14M13 5l7 7-7 7"/></svg>;
    case "bolt":     return <svg {...p}><path d="M13 2 3 14h7l-1 8 10-12h-7z"/></svg>;
    case "battery":  return <svg {...p}><rect x="2" y="7" width="16" height="10" rx="2"/><path d="M22 11v2"/><path d="M6 10v4M10 10v4"/></svg>;
    case "wrench":   return <svg {...p}><path d="M14.7 6.3a4 4 0 0 0 5 5l-9 9a2.8 2.8 0 1 1-4-4z"/></svg>;
    case "ruler":    return <svg {...p}><path d="M2 14 14 2l8 8L10 22z"/><path d="m6 10 2 2M9 7l2 2M12 4l2 2M3 13l2 2"/></svg>;
    case "leaf":     return <svg {...p}><path d="M11 20A7 7 0 0 1 4 13c0-5 5-11 11-11h5v5c0 6-6 11-9 13z"/><path d="M2 22 11 13"/></svg>;
    case "car":      return <svg {...p}><path d="M5 17h14M6 11l2-5h8l2 5M5 17v3h3v-3M16 17v3h3v-3M3 17h18v-4a2 2 0 0 0-1-1.7L18 11H6l-2 .3A2 2 0 0 0 3 13z"/></svg>;
    case "case":     return <svg {...p}><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18"/></svg>;
    case "helmet":   return <svg {...p}><path d="M4 17a8 8 0 0 1 16 0v2H4z"/><path d="M9 9V5h6v4M2 19h20"/></svg>;
    case "filter":   return <svg {...p}><path d="M3 5h18l-7 9v6l-4-2v-4z"/></svg>;
    default: return null;
  }
};

const Stars = ({ rating = 0, size = 12 }) => (
  <span style={{ display: "inline-flex", gap: 1, color: "var(--brand)" }}>
    {[1,2,3,4,5].map(i => <span key={i} style={{ opacity: i <= Math.round(rating) ? 1 : 0.25 }}><Icon name="star" size={size} /></span>)}
  </span>
);

/* ─── Image helpers ──────────────────────────────────────────────────────── */
const PP = ({ stripe = 0, label, sku }) => {
  const hues = [28, 210, 45, 0, 180, 250];
  const hue = hues[stripe % hues.length];
  const bg1 = `oklch(0.94 0.01 ${hue})`, bg2 = `oklch(0.88 0.015 ${hue})`;
  const angle = 20 + (stripe * 13) % 60;
  return (
    <div className="pp" style={{ background: `repeating-linear-gradient(${angle}deg,${bg1} 0 14px,${bg2} 14px 28px)` }}>
      <div className="pp-grid" />
      <div className="pp-label"><span className="pp-sku">{sku}</span><span className="pp-name">{label}</span></div>
      {["tl","tr","bl","br"].map(c => <div key={c} className={`pp-corner ${c}`} />)}
    </div>
  );
};

// Image upload zone with drag-and-drop
const ImageUploadZone = ({ images = [], onChange, bucket = "protech-media", folder = "products", maxImages = 5, showToast }) => {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  const handleFiles = async (files) => {
    const arr = Array.from(files).slice(0, maxImages - images.length);
    if (!arr.length) return;
    setUploading(true);
    try {
      const urls = await Promise.all(arr.map(f => sbUpload(bucket, `${folder}/${uid()}-${f.name.replace(/\s/g,"_")}`, f)));
      onChange([...images, ...urls]);
      showToast?.("تم رفع الصور بنجاح ✓");
    } catch (e) {
      showToast?.("فشل رفع الصور: " + e.message, "error");
    }
    setUploading(false);
  };

  return (
    <div>
      <div
        className={`img-upload-zone${dragging ? " drag" : ""}`}
        onClick={() => fileRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
      >
        <Icon name={uploading ? "upload" : "image"} size={28} />
        {uploading ? <span>جاري الرفع…</span> : <><b>اضغط لرفع صورة</b><span>أو اسحب وأفلت هنا • JPEG, PNG, WEBP حتى 10MB</span></>}
      </div>
      <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={e => handleFiles(e.target.files)} />
      {images.length > 0 && (
        <div className="img-thumb-grid">
          {images.map((url, i) => (
            <div key={url} className={`img-thumb${i === 0 ? " primary" : ""}`}>
              <img src={url} alt="" />
              <button className="img-thumb-del" onClick={e => { e.stopPropagation(); onChange(images.filter((_, j) => j !== i)); }}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Site image slot (for hero / banners) — click to replace
const SiteImageSlot = ({ src, folder, fallback, onUpdate, showToast, style = {} }) => {
  const fileRef = useRef();
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await sbUpload("protech-media", `${folder}/${uid()}-${file.name.replace(/\s/g,"_")}`, file);
      onUpdate(url);
      showToast?.("تم تحديث الصورة ✓");
    } catch (e) { showToast?.("فشل الرفع", "error"); }
    setUploading(false);
  };

  return (
    <div className="site-img" style={{ ...style, width: "100%", height: "100%" }}>
      {src ? <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : fallback}
      <div className="site-img-edit" onClick={() => fileRef.current?.click()}>
        <Icon name={uploading ? "upload" : "image"} size={28} />
        <span>{uploading ? "جاري الرفع…" : "استبدل الصورة"}</span>
      </div>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => handleFile(e.target.files[0])} />
    </div>
  );
};

/* ─── Product card ───────────────────────────────────────────────────────── */
const ProductCard = ({ p, onAdd, onNavigate }) => {
  const imgs = Array.isArray(p.images) ? p.images : (p.images ? [] : []);
  const thumb = imgs[0] || null;
  const discount = p.old_price > p.price ? Math.round((1 - p.price / p.old_price) * 100) : 0;
  const displayBadge = p.badge || (discount > 0 ? `وفر ${discount}%` : null);

  return (
    <article className="card" onClick={() => onNavigate?.("product", { product: p })}>
      <div className="card-media">
        {thumb ? <img src={thumb} alt={p.name} /> : <PP stripe={p.id % 6} label={p.name} sku={p.code} />}
        {displayBadge && <span className="badge">{displayBadge}</span>}
        <button className="wish" aria-label="حفظ" onClick={e => e.stopPropagation()}><Icon name="heart" size={16} /></button>
      </div>
      <div className="card-body">
        <div className="card-sku">
          <span className="sku-mono">{p.code}</span>
          {p.rating && <span className="card-rating"><Stars rating={p.rating} size={11} /> <b>{p.rating}</b> <span>({p.review_count || 0})</span></span>}
        </div>
        <h3 className="card-name">{p.name}</h3>
        <div className="card-price-row">
          <div className="card-price">
            <span className="cur">ج.م</span>
            <span className="amt">{fmtEGP(p.price)}</span>
            {p.old_price > p.price && <span className="retail">{fmtEGP(p.old_price)}</span>}
          </div>
        </div>
        <div className="card-foot">
          <div className="card-stock">
            <span className="dot-green" />
            {p.qty > 0 ? `متوفر • شحن 48 ساعة` : <span style={{ color: "var(--red)" }}>نفذ المخزون</span>}
          </div>
          <button className="add" disabled={p.qty <= 0} onClick={e => { e.stopPropagation(); onAdd?.(p); }}>
            <Icon name="plus" size={14} /> <span>أضف للسلة</span>
          </button>
        </div>
      </div>
    </article>
  );
};

/* ─── Header ─────────────────────────────────────────────────────────────── */
const MEGA_COLS = [
  { title: "الأكثر طلباً", items: ["دريل بطارية 18V","جلاخة زاوية","طقم مفاتيح 145 قطعة","ليزر قياس مسافات","منشار دائري"] },
  { title: "حسب الاستخدام", items: ["النجارة","السيارات","الحدائق","السباكة","الكهرباء"] },
  { title: "عروض وخصومات", items: ["عروض الأسبوع","تصفية المخزون","حزم موفرة","أكثر من ٣٠٪ خصم","وصل حديثاً"] },
];
const MegaMenu = ({ open, onClose }) => !open ? null : (
  <div className="mega" onMouseLeave={onClose}>
    <div className="wrap mega-inner">
      <div className="mega-cats">
        {CATS.map(c => (
          <a key={c.id} className="mega-cat" href={`#${c.id}`} onClick={onClose}>
            <span className="mega-cat-icon"><Icon name={c.icon} size={22} /></span>
            <span className="mega-cat-text"><b>{c.ar}</b><small>{c.en}</small></span>
            <span className="mega-cat-chev"><Icon name="chev" size={14} /></span>
          </a>
        ))}
      </div>
      <div className="mega-cols">
        {MEGA_COLS.map(col => (
          <div key={col.title} className="mega-col"><h4>{col.title}</h4><ul>{col.items.map(it => <li key={it}><a href="#">{it}</a></li>)}</ul></div>
        ))}
        <div className="mega-promo">
          <div className="mega-promo-tag">خصم حصري</div>
          <div className="mega-promo-title">خصم ١٠٪ على أول طلب</div>
          <div className="mega-promo-sub">استخدم كود WELCOME10 عند إتمام الشراء</div>
          <a className="mega-promo-cta" href="#">ابدأ التسوق <Icon name="arrow" size={14} /></a>
        </div>
      </div>
    </div>
  </div>
);

const SiteHeader = ({ cartCount, cartTotal, onCart, dark, setDark, navigate, logoSrc }) => {
  const [menu, setMenu] = useState(false);
  const [q, setQ] = useState("");
  return (
    <header className="site-header">
      <div className="topbar">
        <div className="wrap topbar-inner">
          <div className="tb-left">
            <span className="tb-item"><Icon name="truck" size={14} /> شحن مجاني على الطلبات فوق ٢٠٠٠ ج.م</span>
            <span className="tb-sep" />
            <span className="tb-item"><Icon name="pin" size={14} /> التوصيل لكل المحافظات</span>
            <span className="tb-sep" />
            <span className="tb-item"><Icon name="shield" size={14} /> وكيل رسمي Total و Wadfow</span>
          </div>
          <div className="tb-right">
            <button className="tb-btn" onClick={() => setDark(!dark)}><Icon name={dark ? "sun" : "moon"} size={14} /></button>
            <span className="tb-sep" />
            <a className="tb-link" href="https://wa.me/201034482071"><Icon name="phone" size={14} /> ٠١٠٣٤٤٨٢٠٧١</a>
          </div>
        </div>
      </div>
      <div className="wrap hdr">
        <button className="brand" onClick={() => navigate("home")}>
          <div className="brand-mark">{logoSrc && <img src={logoSrc} alt="Protech" />}</div>
          <div className="brand-text"><b>بروتيك</b><small>الشغل عليك والعدة علينا</small></div>
        </button>
        <div className="search">
          <button className="search-cat" type="button">كل الأقسام <Icon name="chevdown" size={14} /></button>
          <input className="search-input" placeholder="ابحث عن أكثر من ٢٠٬٠٠٠ منتج — دريل، جلاخة، مفاتيح…" value={q} onChange={e => setQ(e.target.value)} />
          <button className="search-btn"><Icon name="search" size={18} /><span>بحث</span></button>
        </div>
        <div className="hdr-right">
          <button className="hdr-pill" onClick={onCart}>
            {cartCount > 0 && <span className="hdr-cart-badge">{cartCount}</span>}
            <Icon name="cart" size={20} />
            <span className="hdr-pill-t"><small>السلة</small><b>{fmtEGP(cartTotal)} ج.م</b></span>
          </button>
        </div>
      </div>
      <nav className="navbar" onMouseLeave={() => setMenu(false)}>
        <div className="wrap nav-inner">
          <button className="nav-all" onMouseEnter={() => setMenu(true)} onClick={() => setMenu(!menu)}>
            <Icon name="menu" size={16} /> كل الأقسام <Icon name="chevdown" size={12} />
          </button>
          <a className="nav-link hot" href="#top"><Icon name="tag" size={14} /> عروض اليوم</a>
          {CATS.slice(0, 4).map(c => <a key={c.id} className="nav-link" href={`#${c.id}`}>{c.ar}</a>)}
          <div className="nav-spacer" />
          <a className="nav-link muted" href="https://wa.me/201034482071"><Icon name="chat" size={14} /> واتساب</a>
        </div>
        <MegaMenu open={menu} onClose={() => setMenu(false)} />
      </nav>
    </header>
  );
};

/* ─── Hero ───────────────────────────────────────────────────────────────── */
const HeroTicker = () => (
  <div className="ticker">
    <div className="ticker-track">
      {[0,1].map(i => (
        <div className="ticker-group" key={i}>
          {[["truck","شحن مجاني +٢٠٠٠ ج.م"],["shield","وكيل رسمي Total و Wadfow"],["tag","خصم ١٠٪ على أول طلب: WELCOME10"],["chat","استشارة فنية مجانية"],["phone","واتساب ٠١٠٣٤٤٨٢٠٧١"]].map(([ic,txt],j) => (
            <><span key={j}><Icon name={ic} size={14} /> {txt}</span><span className="dot">•</span></>
          ))}
        </div>
      ))}
    </div>
  </div>
);

const HeroA = ({ products, settings, onAdd, navigate, onUpdateSettings, showToast, editMode }) => {
  const heroImgs = settings.hero_images?.value || {};
  const updateHeroImg = async (slot, url) => {
    const next = { ...heroImgs, [slot]: url };
    await sb(`site_settings?key=eq.hero_images`, { method: "PATCH", prefer: "return=minimal", body: JSON.stringify({ value: next }) });
    onUpdateSettings("hero_images", next);
  };
  const featured = products.filter(p => p.is_featured).slice(0, 3);

  return (
    <section className="hero hero-a">
      <div className="wrap hero-grid">
        <div className="hero-lead">
          <div className="eyebrow"><span className="num">01</span> <b>مرحباً بك في بروتيك</b></div>
          <h1>الشغل عليك<br /><span className="hl">والعدة علينا.</span></h1>
          <p className="hero-sub">متجرك الإلكتروني لأدوات البناء والصيانة في مصر — الوكيل الرسمي لـ Total و Wadfow، توصيل سريع لكل المحافظات.</p>
          <div className="hero-ctas">
            <button className="btn btn-primary" onClick={() => navigate("shop")}>ابدأ التسوق <Icon name="arrow" size={16} /></button>
            <a className="btn btn-ghost" href="https://wa.me/201034482071"><Icon name="chat" size={14} /> تواصل واتساب</a>
          </div>
          <div className="hero-trust">
            <div><b>١٠٠٪</b><small>منتجات أصلية من الوكيل</small></div>
            <div><b>٤٨ ساعة</b><small>توصيل لكل المحافظات</small></div>
            <div><b>٢٤/٧</b><small>دعم على واتساب</small></div>
          </div>
        </div>
        <div className="hero-visuals">
          <div className="hv-main" style={{ aspectRatio: "4/3", overflow: "hidden", position: "relative" }}>
            {editMode
              ? <SiteImageSlot src={heroImgs.slot1} folder="hero" fallback={<PP stripe={3} label="صورة رئيسية" sku="HERO/01" />} onUpdate={url => updateHeroImg("slot1", url)} showToast={showToast} style={{ height: "100%" }} />
              : heroImgs.slot1 ? <img src={heroImgs.slot1} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <PP stripe={3} label="صورة رئيسية — أدوات مميزة" sku="HERO / 01" />
            }
            <span className="hv-badge">صورة رئيسية</span>
          </div>
          <div className="hv-thumbs">
            {["slot2","slot3"].map((slot, idx) => (
              <div key={slot} className="hv-thumb" style={{ aspectRatio: "1/1", overflow: "hidden" }}>
                {editMode
                  ? <SiteImageSlot src={heroImgs[slot]} folder="hero" fallback={<PP stripe={idx+1} label={idx===0?"عرض الأسبوع":"وصل حديثاً"} sku={`HERO/0${idx+2}`} />} onUpdate={url => updateHeroImg(slot, url)} showToast={showToast} style={{ height: "100%" }} />
                  : heroImgs[slot] ? <img src={heroImgs[slot]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <PP stripe={idx+1} label={idx===0?"عرض الأسبوع":"وصل حديثاً"} sku={`HERO/0${idx+2}`} />
                }
              </div>
            ))}
          </div>
        </div>
        <div className="hero-cats">
          <div className="hero-cats-head"><span className="num">02</span><h3>تسوق حسب القسم</h3><a className="muted-link" href="#categories">عرض الكل <Icon name="chev" size={12} /></a></div>
          <div className="hero-cats-grid">
            {CATS.map(c => (
              <a key={c.id} className="mini-cat" href={`#${c.id}`}>
                <span className="mini-cat-icon"><Icon name={c.icon} size={22} /></span>
                <span className="mini-cat-text"><b>{c.ar}</b><small>{c.en}</small></span>
              </a>
            ))}
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
        {cta && <button className="sec-cta" onClick={cta.fn}>{cta.label} <Icon name="chev" size={12} /></button>}
      </div>
      {children}
    </div>
  </section>
);

const TopSellingSection = ({ products, onAdd, navigate }) => {
  const [filter, setFilter] = useState("all");
  const CATS_FILTER = [{ id: "all", label: "الكل" }, ...CATS.slice(0, 4).map(c => ({ id: c.id, label: c.ar.replace("أدوات ","") }))];
  const items = products.filter(p => filter === "all" || p.category === filter);
  return (
    <Section id="top" num="03" eyebrow="TOP SELLING" title="الأكثر مبيعاً هذا الشهر" cta={{ label: "عرض كل المنتجات", fn: () => navigate("shop") }}>
      <div className="tabs">
        {CATS_FILTER.map(t => <button key={t.id} className={`tab ${filter===t.id?"on":""}`} onClick={() => setFilter(t.id)}>{t.label}</button>)}
        <div className="tabs-spacer" />
        <button className="tabs-filter"><Icon name="filter" size={14} /> فرز</button>
      </div>
      {items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "var(--ink-3)" }}>لا توجد منتجات في هذا القسم بعد.</div>
      ) : (
        <div className="rail rail-3">
          {items.slice(0,6).map(p => <ProductCard key={p.id} p={p} onAdd={onAdd} onNavigate={navigate} />)}
        </div>
      )}
    </Section>
  );
};

const CategoriesSection = ({ products }) => {
  const catsWithCount = CATS.map(c => ({ ...c, count: products.filter(p => p.category === c.id).length }));
  return (
    <Section id="categories" num="02" eyebrow="ALL DEPARTMENTS" title="تسوق حسب القسم">
      <div className="cats-grid">
        {catsWithCount.map((c, i) => (
          <a key={c.id} className="cat-tile" href={`#${c.id}`} style={{ "--i": i }}>
            <div className="cat-tile-media">
              <div className="cat-tile-icon"><Icon name={c.icon} size={36} stroke={1.4} /></div>
              <div className="cat-tile-stripes" />
            </div>
            <div className="cat-tile-body">
              <div className="cat-tile-title"><b>{c.ar}</b><small>{c.en}</small></div>
              <div className="cat-tile-foot"><span>{c.count} منتج</span><Icon name="chev" size={14} /></div>
            </div>
          </a>
        ))}
      </div>
    </Section>
  );
};

const DealBanners = ({ settings, onUpdateSettings, showToast, editMode }) => {
  const banners = settings.banners?.value || {};
  const updateBanner = async (key, url) => {
    const next = { ...banners, [key]: url };
    await sb(`site_settings?key=eq.banners`, { method: "PATCH", prefer: "return=minimal", body: JSON.stringify({ value: next }) });
    onUpdateSettings("banners", next);
  };
  const BNR_META = [
    { key: "banner1", cls: "bnr-1", tag: "عروض الأسبوع", h3: "خصومات حتى ٢٥٪\nعلى أدوات توتال", p: "توفير كبير على مجموعة مختارة — لفترة محدودة", cta: "تسوق العروض" },
    { key: "banner2", cls: "bnr-2", tag: "حزم جاهزة", h3: "طقم أدوات كامل\nبسعر موفر", p: "طقم نجار • طقم سباك • طقم كهربائي", cta: "شاهد الحزم" },
    { key: "banner3", cls: "bnr-3", tag: "ماركات رسمية", h3: "Total و Wadfow\nمن الوكيل مباشرة", p: "منتجات أصلية ١٠٠٪ مع ضمان الوكيل", cta: "تصفح الماركات" },
  ];
  return (
    <div className="banners-wrap"><div className="banners" style={{ padding: 0 }}>
      {BNR_META.map(b => (
        <div key={b.key} className={`bnr ${b.cls}`} style={{ padding: 0 }}>
          {banners[b.key] && <div className="bnr-bg" style={{ backgroundImage: `url(${banners[b.key]})` }} />}
          <div className={`bnr-bg-overlay ${b.cls}`} />
          {editMode && (
            <div style={{ position: "absolute", top: 8, insetInlineEnd: 8, zIndex: 10 }}>
              <SiteImageSlot src={null} folder="banners" fallback={null}
                onUpdate={url => updateBanner(b.key, url)} showToast={showToast}
                style={{ width: 36, height: 36, borderRadius: "var(--radius)", overflow: "visible" }}>
                <button style={{ background: "var(--brand)", border: 0, borderRadius: "var(--radius)", width: 36, height: 36, display: "grid", placeItems: "center", color: "#fff", cursor: "pointer", zIndex: 10, position: "relative" }}><Icon name="image" size={16} /></button>
              </SiteImageSlot>
            </div>
          )}
          <div className="bnr-stripes" />
          <div className="bnr-inner">
            <div className="bnr-tag">{b.tag}</div>
            <h3>{b.h3.split("\n").map((l,i) => <span key={i}>{l}{i===0&&<br/>}</span>)}</h3>
            <p>{b.p}</p>
            <span className="bnr-cta">{b.cta} <Icon name="arrow" size={14} /></span>
          </div>
        </div>
      ))}
    </div></div>
  );
};

const CategoryRail = ({ catId, num, eyebrow, title, desc, products, onAdd, navigate }) => {
  const items = products.filter(p => p.category === catId);
  if (!items.length) return null;
  return (
    <section id={catId} className="section cat-rail">
      <div className="wrap">
        <div className="rail-hero">
          <div className="rail-hero-text">
            <div className="sec-eyebrow"><span className="num">{num}</span> <b>{eyebrow}</b></div>
            <h2 className="sec-title">{title}</h2>
            <p className="rail-desc">{desc}</p>
            <button className="btn btn-dark" onClick={() => navigate("shop", { category: catId })}>تصفح القسم كاملاً <Icon name="arrow" size={14} /></button>
            <div className="rail-stat">
              <div><b>{items.length}</b><small>منتج متاح</small></div>
              <div><b>١٢</b><small>ماركة رسمية</small></div>
              <div><b>٤.٨</b><small>تقييم العملاء</small></div>
            </div>
          </div>
          <div className="rail-items">
            {items.slice(0,4).map(p => <ProductCard key={p.id} p={p} onAdd={onAdd} onNavigate={navigate} />)}
          </div>
        </div>
      </div>
    </section>
  );
};

const BrandsSection = ({ settings }) => {
  const brands = settings.brands?.value || [{ name:"TOTAL",tag:"الوكيل الرسمي"},{name:"WADFOW",tag:"الوكيل الرسمي"},{name:"MAKITA"},{name:"DEWALT"},{name:"BOSCH"},{name:"STANLEY"},{name:"BLACK+DECKER"},{name:"INGCO"}];
  return (
    <section id="brands" className="section brands-section">
      <div className="wrap">
        <div className="sec-head">
          <div className="sec-eyebrow"><span className="num">06</span> <b>OFFICIAL BRANDS</b></div>
          <h2 className="sec-title">ماركات نحمل وكالتها الرسمية</h2>
          <div className="sec-rule" />
        </div>
        <div className="brands-grid">
          {brands.map(b => (
            <a key={b.name} className="brand-tile" href="#">
              <span className="brand-logo">{b.name}</span>
              {b.tag && <small className="brand-tag">{b.tag}</small>}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};

const REVIEWS_DATA = [
  { name:"محمود السيد", role:"عميل • القاهرة", rating:5, text:"اشتريت دريل توتال من بروتيك، جودة ممتازة وسعر أقل من السوق. التوصيل وصل بيتي في المعادي خلال يومين." },
  { name:"Ahmed Farouk", role:"عميل • الإسكندرية", rating:5, text:"أدوات ممتازة وأسعار معقولة. الطلب وصل بسرعة والتغليف كان محترم جداً، هكمل شراء من عندكم." },
  { name:"كريم عبد الرحمن", role:"عميل • الجيزة", rating:5, text:"اشتريت طقم أدوات وادفو وكنت متردد في البداية، لكن الجودة فاقت توقعاتي. خدمة عملاء ممتازة على الواتساب." },
];
const ReviewsSection = () => (
  <Section id="reviews" num="07" eyebrow="REAL REVIEWS" title="عملاؤنا يشهدون">
    <div className="reviews-grid">
      {REVIEWS_DATA.map((r,i) => (
        <article key={i} className="review">
          <div className="review-head"><Stars rating={r.rating} size={14} /><span className="review-verified"><Icon name="check" size={12} /> مشتري موثق</span></div>
          <p className="review-text">{r.text}</p>
          <div className="review-foot">
            <div className="review-avatar">{r.name[0]}</div>
            <div><b>{r.name}</b><small>{r.role}</small></div>
          </div>
        </article>
      ))}
    </div>
    <div className="reviews-strip">
      <div><b>٤.٨ / ٥</b><small>متوسط التقييم</small></div><span className="vr" />
      <div><b>١٨٬٤٠٠+</b><small>مراجعة موثقة</small></div><span className="vr" />
      <div><b>٩٤٪</b><small>يوصون بالمتجر</small></div><span className="vr" />
      <div><b>٤٨ ساعة</b><small>متوسط التوصيل</small></div>
    </div>
  </Section>
);

const SiteFooter = ({ logoSrc }) => (
  <footer className="site-footer">
    <div className="wrap foot-top">
      <div className="foot-brand">
        <div className="foot-logo">{logoSrc && <img src={logoSrc} alt="Protech" />}</div>
        <p>بروتيك — متجر إلكتروني للأدوات والمعدات في مصر. الوكيل الرسمي لماركات توتال وWadfow، توصيل لكل المحافظات.</p>
        <div className="foot-contact"><span><Icon name="phone" size={14} /> ٠١٠٣٤٤٨٢٠٧١</span><span><Icon name="chat" size={14} /> واتساب ٢٤/٧</span></div>
      </div>
      {[{title:"التسوق",items:["كل الأقسام","العروض","وصل حديثاً","الماركات","الحزم الموفرة"]},{title:"الحساب",items:["حسابي","طلباتي","المفضلة","سلة المشتريات","تتبع الطلب"]},{title:"الدعم",items:["الشحن والتوصيل","الاستبدال والاسترجاع","ضمان الأدوات","الأسئلة الشائعة","تواصل معنا"]}].map(col => (
        <div key={col.title} className="foot-col"><h5>{col.title}</h5><ul>{col.items.map(it=><li key={it}><a href="#">{it}</a></li>)}</ul></div>
      ))}
      <div className="foot-col foot-news">
        <h5>اشترك للعروض</h5>
        <div className="news-row"><input placeholder="بريدك الإلكتروني" /><button><Icon name="arrow" size={14} /></button></div>
        <small>عروض حصرية وتخفيضات موسمية مباشرة على بريدك.</small>
        <div className="pay"><span>فيزا</span><span>ماستركارد</span><span>ميزة</span><span>دفع عند الاستلام</span><span>فوري</span></div>
      </div>
    </div>
    <div className="foot-bot"><div className="wrap foot-bot-inner">
      <span>© ٢٠٢٦ بروتيك. جميع الحقوق محفوظة.</span>
      <span className="foot-links"><a href="#">سياسة الخصوصية</a> • <a href="#">الشروط والأحكام</a> • <a href="#">سياسة الإرجاع</a></span>
    </div></div>
  </footer>
);

/* ─── Shop page ──────────────────────────────────────────────────────────── */
const ShopPage = ({ products, onAdd, navigate, initialCat }) => {
  const [cat, setCat] = useState(initialCat || "all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("default");
  let items = products.filter(p => (cat === "all" || p.category === cat) && (!search || p.name.includes(search) || p.code?.includes(search)));
  if (sort === "price_asc") items = [...items].sort((a,b) => a.price-b.price);
  if (sort === "price_desc") items = [...items].sort((a,b) => b.price-a.price);
  return (
    <div style={{ maxWidth: "var(--wrap)", margin: "0 auto", padding: "40px 24px" }}>
      <h1 style={{ margin: "0 0 24px", fontSize: "2rem", fontWeight: 900 }}>كل المنتجات</h1>
      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 32, alignItems: "start" }}>
        <div style={{ position: "sticky", top: 100 }}>
          <div style={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: "var(--radius-md)", padding: 20, marginBottom: 16 }}>
            <b style={{ display: "block", marginBottom: 12, fontSize: "0.9rem" }}>بحث</b>
            <input className="form-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="اسم المنتج أو الكود…" style={{ width: "100%" }} />
          </div>
          <div style={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: "var(--radius-md)", padding: 20, marginBottom: 16 }}>
            <b style={{ display: "block", marginBottom: 12, fontSize: "0.9rem" }}>الأقسام</b>
            {[{ id: "all", ar: "الكل" }, ...CATS].map(c => (
              <button key={c.id} onClick={() => setCat(c.id)} style={{ display: "block", width: "100%", textAlign: "right", padding: "8px 12px", background: cat===c.id?"var(--brand-soft)":"none", border: "none", borderRadius: "var(--radius)", fontFamily: "var(--f-ar)", fontSize: "0.88rem", cursor: "pointer", color: cat===c.id?"var(--brand-ink)":"var(--ink-2)", fontWeight: cat===c.id?700:400, marginBottom: 2 }}>{c.ar}</button>
            ))}
          </div>
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <span style={{ color: "var(--ink-3)", fontSize: "0.88rem" }}>{items.length} منتج</span>
            <select className="form-input" style={{ width: "auto", padding: "8px 14px" }} value={sort} onChange={e => setSort(e.target.value)}>
              <option value="default">الترتيب الافتراضي</option>
              <option value="price_asc">السعر: من الأقل</option>
              <option value="price_desc">السعر: من الأعلى</option>
            </select>
          </div>
          {items.length === 0
            ? <div style={{ textAlign: "center", padding: "60px 0", color: "var(--ink-3)" }}><Icon name="search" size={48} /><p style={{ marginTop: 16 }}>لا توجد نتائج. جرب تغيير معايير البحث.</p></div>
            : <div className="rail rail-3">{items.map(p => <ProductCard key={p.id} p={p} onAdd={onAdd} onNavigate={navigate} />)}</div>
          }
        </div>
      </div>
    </div>
  );
};

/* ─── Product detail page ────────────────────────────────────────────────── */
const ProductDetailPage = ({ product, onAdd, products, navigate }) => {
  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState(0);
  const imgs = Array.isArray(product.images) ? product.images : [];
  const suggested = products.filter(p => p.id !== product.id && p.category === product.category).slice(0, 4);
  const discount = product.old_price > product.price ? Math.round((1 - product.price / product.old_price) * 100) : 0;

  return (
    <div className="product-detail">
      <div style={{ fontSize: "0.84rem", color: "var(--ink-3)", marginBottom: 28 }}>
        <button onClick={() => navigate("home")} style={{ background: "none", border: 0, color: "var(--brand)", cursor: "pointer", fontFamily: "var(--f-ar)", fontSize: "0.84rem" }}>الرئيسية</button>
        <span style={{ margin: "0 8px" }}>›</span>
        <button onClick={() => navigate("shop")} style={{ background: "none", border: 0, color: "var(--brand)", cursor: "pointer", fontFamily: "var(--f-ar)", fontSize: "0.84rem" }}>المتجر</button>
        <span style={{ margin: "0 8px" }}>›</span>
        <span>{product.name}</span>
      </div>
      <div className="product-grid" style={{ marginBottom: 48 }}>
        <div className="product-gallery">
          <div className="gallery-main">
            {imgs[activeImg] ? <img src={imgs[activeImg]} alt={product.name} /> : <PP stripe={product.id%6} label={product.name} sku={product.code} />}
          </div>
          {imgs.length > 1 && (
            <div className="gallery-thumbs">
              {imgs.map((img, i) => (
                <div key={i} className={`gallery-thumb${activeImg===i?" on":""}`} onClick={() => setActiveImg(i)}>
                  <img src={img} alt="" />
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="product-info">
          <div style={{ fontFamily: "var(--f-mono)", fontSize: "0.76rem", color: "var(--ink-3)" }}>{product.code}</div>
          <h1 style={{ margin: "8px 0", fontSize: "1.8rem", fontWeight: 900, lineHeight: 1.3 }}>{product.name}</h1>
          {product.rating && <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}><Stars rating={product.rating} size={16} /><span style={{ color: "var(--ink-3)", fontSize: "0.88rem" }}>({product.review_count || 0} تقييم)</span></div>}
          {product.description && <p style={{ color: "var(--ink-2)", lineHeight: 1.7, fontSize: "0.95rem", marginBottom: 16 }}>{product.description}</p>}
          <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 8 }}>
            <span style={{ fontSize: "2.4rem", fontWeight: 900, fontFamily: "var(--f-mono)", color: "var(--brand)" }}>{fmtEGP(product.price)}</span>
            <span style={{ fontSize: "0.9rem", color: "var(--ink-3)" }}>ج.م</span>
            {product.old_price > product.price && <span style={{ textDecoration: "line-through", color: "var(--ink-3)", fontSize: "1rem" }}>{fmtEGP(product.old_price)} ج.م</span>}
            {discount > 0 && <span className="badge" style={{ position: "static" }}>وفر {discount}%</span>}
          </div>
          <div style={{ color: product.qty > 0 ? "var(--green)" : "var(--red)", fontWeight: 700, fontSize: "0.88rem", marginBottom: 20 }}>
            {product.qty > 0 ? `✓ متوفر (${product.qty} قطعة في المخزون)` : "✗ نفذ المخزون"}
          </div>
          {product.qty > 0 && (
            <>
              <div className="qty-row" style={{ marginBottom: 20 }}>
                <span style={{ fontWeight: 700 }}>الكمية:</span>
                <div className="qty-ctrl">
                  <button onClick={() => setQty(q => Math.max(1,q-1))}>−</button>
                  <span>{qty}</span>
                  <button onClick={() => setQty(q => Math.min(product.qty, q+1))}>+</button>
                </div>
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <button className="btn btn-primary lg" onClick={() => onAdd({ ...product, qty })} style={{ flex: 1 }}>+ أضف للسلة</button>
                <button className="btn btn-dark lg" onClick={() => { onAdd({ ...product, qty }); navigate("checkout"); }} style={{ flex: 1 }}>اشترِ الآن</button>
              </div>
            </>
          )}
          <div style={{ background: "var(--bg-2)", borderRadius: "var(--radius)", padding: "16px 20px", marginTop: 20, display: "flex", gap: 24, flexWrap: "wrap" }}>
            {[["🚚","شحن 48 ساعة"],["🔒","منتج أصلي"],["↩️","استبدال 7 أيام"]].map(([ic,t]) => (
              <span key={t} style={{ fontSize: "0.84rem", color: "var(--ink-2)", display: "flex", alignItems: "center", gap: 6 }}><span>{ic}</span>{t}</span>
            ))}
          </div>
        </div>
      </div>
      {suggested.length > 0 && (
        <div>
          <h2 style={{ fontSize: "1.4rem", fontWeight: 900, marginBottom: 20 }}>منتجات قد تعجبك</h2>
          <div className="rail rail-4">{suggested.map(p => <ProductCard key={p.id} p={p} onAdd={onAdd} onNavigate={navigate} />)}</div>
        </div>
      )}
    </div>
  );
};

/* ─── Cart Drawer ────────────────────────────────────────────────────────── */
const CartDrawer = ({ open, items, onClose, onInc, onDec, onRemove, navigate }) => {
  const total = items.reduce((s, it) => s + it.price * it.qty, 0);
  const shipping = total > 2000 ? 0 : 50;
  return (
    <>
      <div className={`drawer-scrim${open?" on":""}`} onClick={onClose} />
      <aside className={`drawer${open?" on":""}`}>
        <div className="drawer-head">
          <div><b>سلة المشتريات</b><small>{items.length} {items.length===1?"منتج":"منتجات"}</small></div>
          <button className="icon-btn" onClick={onClose}><Icon name="close" size={18} /></button>
        </div>
        {items.length === 0 ? (
          <div className="drawer-empty">
            <div className="empty-icon"><Icon name="cart" size={40} stroke={1.2} /></div>
            <b>سلتك فاضية</b><p>ابدأ بتصفح العروض أو اختار قسم من الأقسام.</p>
            <button className="btn btn-primary" onClick={onClose}>تصفح المنتجات</button>
          </div>
        ) : (
          <>
            <div className="drawer-body">
              {items.map(it => {
                const thumb = Array.isArray(it.images) ? it.images[0] : null;
                return (
                  <div key={it.id} className="drawer-item">
                    <div className="drawer-media">{thumb ? <img src={thumb} alt={it.name} style={{ width:"100%",height:"100%",objectFit:"cover" }} /> : <PP stripe={it.id%6} label={it.name} sku={it.code} />}</div>
                    <div className="drawer-meta">
                      <div className="drawer-sku">{it.code}</div>
                      <div className="drawer-name">{it.name}</div>
                      <div className="drawer-price"><span className="amt">{fmtEGP(it.price)} ج.م</span></div>
                      <div className="drawer-actions">
                        <div className="qty">
                          <button onClick={() => onDec(it.id)}><Icon name="minus" size={12} /></button>
                          <span>{it.qty}</span>
                          <button onClick={() => onInc(it.id)}><Icon name="plus" size={12} /></button>
                        </div>
                        <button className="drawer-del" onClick={() => onRemove(it.id)}><Icon name="trash" size={14} /> <span>حذف</span></button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="drawer-foot">
              <div className="drawer-row"><span>المجموع الفرعي</span><b>{fmtEGP(total)} ج.م</b></div>
              <div className="drawer-row"><span>الشحن</span><b>{shipping===0?"مجاني 🎉":`${shipping} ج.م`}</b></div>
              <div className="drawer-row total"><span>الإجمالي</span><b>{fmtEGP(total+shipping)} ج.م</b></div>
              <button className="btn btn-primary btn-block" onClick={() => { onClose(); navigate("checkout"); }}>إتمام الشراء <Icon name="arrow" size={14} /></button>
              <small className="drawer-note"><Icon name="shield" size={12} /> دفع آمن • إرجاع مجاني ١٤ يوم</small>
            </div>
          </>
        )}
      </aside>
    </>
  );
};

/* ─── Checkout ───────────────────────────────────────────────────────────── */
const CheckoutPage = ({ cart, navigate, setCart, products, setProducts, showToast }) => {
  const [form, setForm] = useState({ name:"", phone:"", address:"", city:"", notes:"" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const total = cart.reduce((s,it) => s + it.price*it.qty, 0);
  const shipping = total > 2000 ? 0 : 50;
  const grand = total + shipping;

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "الاسم مطلوب";
    if (!/^01[0-9]{9}$/.test(form.phone)) e.phone = "رقم الهاتف غير صحيح (01XXXXXXXXX)";
    if (!form.address.trim()) e.address = "العنوان مطلوب";
    if (!form.city) e.city = "المحافظة مطلوبة";
    setErrors(e);
    return !Object.keys(e).length;
  };

  const submit = async () => {
    if (!validate() || !cart.length) return;
    setLoading(true);
    try {
      const code = mkCode();
      await sb("orders", {
        method: "POST", prefer: "return=minimal",
        body: JSON.stringify({
          code, customer_name: form.name, phone: form.phone,
          ship_code: `${form.address} — ${form.city}`,
          products: cart.map(i => ({ id:i.id, code:i.code, name:i.name, qty:i.qty, price:i.price })),
          total: grand, status: "Processing",
          date: new Date().toISOString().split("T")[0],
          est_shipping: shipping, actual_shipping: 0, warehouse_confirmed: false,
        }),
      });
      for (const item of cart) {
        const dbP = products.find(p => p.id === item.id);
        if (dbP) await sb(`products?id=eq.${item.id}`, { method:"PATCH", prefer:"return=minimal", body: JSON.stringify({ qty: Math.max(0, dbP.qty - item.qty) }) });
      }
      setProducts(prev => prev.map(p => { const ci = cart.find(i=>i.id===p.id); return ci ? {...p, qty: Math.max(0,p.qty-ci.qty)} : p; }));
      setCart([]);
      navigate("confirmation", { orderCode: code, customerName: form.name, total: grand });
    } catch(e) { showToast("حدث خطأ. حاول مرة أخرى.", "error"); }
    setLoading(false);
  };

  const inp = (f) => ({ className:`form-input${errors[f]?" err":""}`, value:form[f], onChange:e=>setForm(x=>({...x,[f]:e.target.value})) });

  if (!cart.length) return <div style={{textAlign:"center",padding:"80px 24px"}}><h2>سلتك فارغة</h2><button className="btn btn-primary" style={{marginTop:20}} onClick={() => navigate("shop")}>العودة للتسوق</button></div>;

  return (
    <div className="checkout-wrap">
      <h1 style={{margin:"0 0 8px",fontWeight:900}}>إتمام الطلب</h1>
      <p style={{color:"var(--ink-3)",marginBottom:32}}>أدخل بياناتك لإتمام عملية الشراء</p>
      <div className="checkout-grid">
        <div>
          <div className="checkout-section">
            <h3><span className="step-num">١</span> بيانات التواصل</h3>
            <div className="form-row">
              <div className="form-group"><label>الاسم الكامل *</label><input {...inp("name")} placeholder="محمد أحمد" />{errors.name&&<span className="form-err">{errors.name}</span>}</div>
              <div className="form-group"><label>رقم الهاتف *</label><input {...inp("phone")} placeholder="01XXXXXXXXX" dir="ltr" />{errors.phone&&<span className="form-err">{errors.phone}</span>}</div>
            </div>
          </div>
          <div className="checkout-section">
            <h3><span className="step-num">٢</span> عنوان التوصيل</h3>
            <div className="form-group"><label>المحافظة *</label>
              <select className={`form-input${errors.city?" err":""}`} value={form.city} onChange={e=>setForm(x=>({...x,city:e.target.value}))}>
                <option value="">اختر المحافظة</option>
                {["القاهرة","الجيزة","الإسكندرية","الشرقية","الدقهلية","القليوبية","المنوفية","الغربية","كفر الشيخ","البحيرة","الإسماعيلية","السويس","بورسعيد","دمياط","سوهاج","أسيوط","المنيا","الفيوم","بني سويف","قنا","الأقصر","أسوان"].map(g=><option key={g}>{g}</option>)}
              </select>
              {errors.city&&<span className="form-err">{errors.city}</span>}
            </div>
            <div className="form-group"><label>العنوان بالتفصيل *</label><input {...inp("address")} placeholder="الشارع، الحي، المدينة" />{errors.address&&<span className="form-err">{errors.address}</span>}</div>
            <div className="form-group"><label>ملاحظات (اختياري)</label><textarea className="form-input" style={{height:80,resize:"none"}} value={form.notes} onChange={e=>setForm(x=>({...x,notes:e.target.value}))} placeholder="أي تعليمات خاصة بالتوصيل…" /></div>
          </div>
          <div className="checkout-section" style={{borderColor:"var(--brand)",borderWidth:2}}>
            <h3><span className="step-num">٣</span> طريقة الدفع</h3>
            <div className="payment-option"><div style={{fontSize:28}}>💰</div><div><b>الدفع عند الاستلام</b><br/><small style={{color:"var(--ink-3)"}}>ادفع نقداً عند وصول طلبك</small></div><span className="badge" style={{position:"static",marginInlineStart:"auto"}}>✓ المتاح</span></div>
          </div>
        </div>
        <div className="order-summary">
          <h3>ملخص طلبك</h3>
          <div className="summary-items">
            {cart.map(it => {
              const thumb = Array.isArray(it.images) ? it.images[0] : null;
              return (
                <div key={it.id} className="summary-item">
                  <div className="summary-item-img">{thumb?<img src={thumb} alt="" />:<PP stripe={it.id%6} label={it.name} sku={it.code} />}</div>
                  <div style={{flex:1}}><div className="summary-item-name">{it.name}</div><div className="summary-item-qty">× {it.qty}</div></div>
                  <div className="summary-item-price">{fmtEGP(it.price*it.qty)}</div>
                </div>
              );
            })}
          </div>
          <div className="summary-divider" />
          <div className="summary-row"><span style={{color:"var(--ink-3)"}}>المجموع الفرعي</span><b>{fmtEGP(total)} ج.م</b></div>
          <div className="summary-row"><span style={{color:"var(--ink-3)"}}>الشحن</span><b style={{color:shipping===0?"var(--green)":undefined}}>{shipping===0?"مجاني 🎉":`${shipping} ج.م`}</b></div>
          <div className="summary-total"><span>الإجمالي</span><span className="amt">{fmtEGP(grand)} ج.م</span></div>
          <button className="btn btn-primary btn-block" style={{marginTop:20,padding:16,fontSize:"1rem"}} onClick={submit} disabled={loading}>{loading?"جاري تأكيد الطلب…":"تأكيد الطلب ✓"}</button>
          <p style={{textAlign:"center",fontSize:"0.76rem",color:"var(--ink-3)",marginTop:10}}>بالضغط توافق على شروط الخدمة</p>
        </div>
      </div>
    </div>
  );
};

/* ─── Confirmation ───────────────────────────────────────────────────────── */
const ConfirmationPage = ({ pageData, navigate }) => {
  const { orderCode, customerName, total } = pageData || {};
  return (
    <div className="confirm-wrap">
      <div className="confirm-card">
        <div className="confirm-icon"><Icon name="check" size={36} /></div>
        <h2 style={{margin:"0 0 4px",fontWeight:900,color:"var(--green)"}}>تم تأكيد طلبك!</h2>
        <p style={{color:"var(--ink-3)",margin:"0 0 8px"}}>شكراً لك {customerName}، سيتواصل معك فريقنا قريباً.</p>
        <div className="confirm-code">{orderCode}</div>
        <div className="confirm-meta">
          <div className="confirm-meta-row"><span style={{color:"var(--ink-3)"}}>إجمالي الطلب</span><b>{fmtEGP(total)} ج.م</b></div>
          <div className="confirm-meta-row"><span style={{color:"var(--ink-3)"}}>طريقة الدفع</span><b>الدفع عند الاستلام</b></div>
          <div className="confirm-meta-row"><span style={{color:"var(--ink-3)"}}>التوصيل المتوقع</span><b style={{color:"var(--green)"}}>٢٤ - ٤٨ ساعة</b></div>
        </div>
        <div style={{background:"var(--bg-2)",borderRadius:"var(--radius)",padding:"14px 18px",marginBottom:24,display:"flex",alignItems:"center",gap:12,textAlign:"right"}}>
          <span style={{fontSize:24}}>💬</span>
          <div><div style={{fontWeight:700,fontSize:"0.9rem",marginBottom:2}}>تتبع طلبك عبر الواتساب</div><div style={{color:"var(--ink-3)",fontSize:"0.82rem"}}>راسلنا برقم طلبك • ٠١٠٣٤٤٨٢٠٧١</div></div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <button className="btn btn-primary btn-block" style={{padding:14}} onClick={() => navigate("home")}>العودة للرئيسية</button>
          <button className="btn btn-ghost btn-block" style={{padding:12}} onClick={() => navigate("shop")}>مواصلة التسوق</button>
        </div>
      </div>
    </div>
  );
};

/* ─── Coming Soon screen ─────────────────────────────────────────────────── */
const ComingSoon = ({ settings, logoSrc }) => {
  const cs = settings.coming_soon?.value || {};
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const bgImg = cs.background_image;

  const handleSubmit = async () => {
    if (!email || !/\S+@\S+\.\S+/.test(email)) return;
    try { await sb("waitlist", { method: "POST", prefer: "return=minimal", body: JSON.stringify({ email }) }); } catch {}
    setSubmitted(true);
  };

  return (
    <div className="cs-wrap">
      {bgImg && <div className="cs-bg-img" style={{ backgroundImage: `url(${bgImg})` }} />}
      <div className="cs-bg" />
      <div className="cs-rule" />
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", maxWidth: 600, width: "100%" }}>
        {logoSrc ? (
          <div className="cs-logo"><img src={logoSrc} alt="Protech" style={{ width: "100%", height: "100%", objectFit: "contain" }} /></div>
        ) : (
          <div className="cs-logo-text"><span>PRO</span>TECH</div>
        )}
        <h1 className="cs-title">{cs.headline || <><span>قريباً</span> — بروتيك أونلاين</>}</h1>
        <p className="cs-sub">{cs.subline || "متجرنا الإلكتروني في الطريق إليك. سجّل بريدك لتكون أول من يعرف."}</p>
        {!submitted ? (
          <div className="cs-form">
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="بريدك الإلكتروني" onKeyDown={e => e.key==="Enter" && handleSubmit()} />
            <button onClick={handleSubmit}>أبلغني عند الإطلاق</button>
          </div>
        ) : (
          <div style={{ padding: "16px 32px", background: "rgba(47,143,79,.2)", borderRadius: "var(--radius-md)", color: "#6de09a", fontWeight: 700, marginBottom: 40 }}>
            ✓ تم التسجيل! سنبلغك عند الإطلاق.
          </div>
        )}
        <div className="cs-trust">
          {[["🚚","شحن لكل المحافظات"],["🔒","منتجات أصلية ١٠٠٪"],["💬","دعم واتساب ٢٤/٧"]].map(([ic,t]) => (
            <div key={t} className="cs-trust-item"><span>{ic}</span><span>{t}</span></div>
          ))}
        </div>
        <div style={{ marginTop: 32, color: "rgba(255,255,255,.4)", fontSize: "0.82rem" }}>
          للتواصل: <a href="https://wa.me/201034482071" style={{ color: "var(--brand)" }}>واتساب ٠١٠٣٤٤٨٢٠٧١</a>
        </div>
      </div>
    </div>
  );
};

/* ─── Toast ──────────────────────────────────────────────────────────────── */
const Toast = ({ msg, type }) => (
  <div className="toast" style={{ background: type==="error" ? "var(--red)" : "var(--green)", color: "#fff" }}>{msg}</div>
);

/* ─── Admin banner for edit mode ─────────────────────────────────────────── */
const EditBar = ({ editMode, setEditMode, comingSoon, toggleComingSoon }) => (
  <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "var(--ink)", color: "var(--bg)", zIndex: 90, padding: "10px 24px", display: "flex", alignItems: "center", gap: 16, fontFamily: "var(--f-mono)", fontSize: "0.82rem", borderTop: "3px solid var(--brand)" }}>
    <span style={{ color: "var(--brand)", fontWeight: 700, letterSpacing: "0.06em" }}>PROTECH ADMIN</span>
    <span style={{ color: "rgba(255,255,255,.3)" }}>|</span>
    <button onClick={() => setEditMode(!editMode)} style={{ background: editMode ? "var(--brand)" : "rgba(255,255,255,.1)", color: editMode?"#fff":"var(--bg)", border: 0, borderRadius: "var(--radius)", padding: "6px 14px", fontFamily: "var(--f-mono)", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer", letterSpacing: "0.04em" }}>
      {editMode ? "✎ وضع التحرير مفعّل" : "✎ تعديل صور الموقع"}
    </button>
    <button onClick={toggleComingSoon} style={{ background: comingSoon ? "#c0392b" : "rgba(47,143,79,.3)", color: comingSoon?"#fff":"#6de09a", border: 0, borderRadius: "var(--radius)", padding: "6px 14px", fontFamily: "var(--f-mono)", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer" }}>
      {comingSoon ? "🔴 الموقع مخفي (Coming Soon)" : "🟢 الموقع منشور"}
    </button>
    <span style={{ color: "rgba(255,255,255,.4)", fontSize: "0.72rem", marginInlineStart: "auto" }}>protech-stores.vercel.app/admin → إدارة المنتجات والطلبات</span>
  </div>
);

/* ─── App root ───────────────────────────────────────────────────────────── */
export default function App() {
  const [products, setProducts] = useState([]);
  const [settings, setSettings] = useState({});
  const [logoSrc, setLogoSrc] = useState(null);
  const [dark, setDark] = useState(false);
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [page, setPage] = useState("home");
  const [pageData, setPageData] = useState(null);
  const [toast, setToast] = useState(null);
  const [editMode, setEditMode] = useState(false);
  // Admin bar: detect if loaded from admin context (query param or localStorage)
  const isAdmin = typeof window !== "undefined" && (new URLSearchParams(window.location.search).get("admin") === "1" || localStorage.getItem("protech_admin") === "1");

  // Load products + settings from Supabase
  useEffect(() => {
    sb("products?select=*&is_published=eq.true&order=sort_order.asc,id.asc").then(d => setProducts(d || [])).catch(() => {});
    sb("site_settings?select=*").then(rows => {
      if (!rows) return;
      const map = {};
      rows.forEach(r => { map[r.key] = r; });
      setSettings(map);
    }).catch(() => {});
    // Try to load logo from storage
    setLogoSrc(`${SB_URL}/storage/v1/object/public/protech-media/brand/logo.jpg`);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    document.documentElement.setAttribute("dir", "rtl");
    document.documentElement.setAttribute("lang", "ar");
  }, [dark]);

  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 2800); };

  const navigate = (p, data = null) => { setPage(p); setPageData(data); window.scrollTo(0, 0); };

  const updateSettings = (key, value) => setSettings(s => ({ ...s, [key]: { ...(s[key] || {}), value } }));

  const comingSoon = settings.coming_soon?.value?.enabled === true;

  const toggleComingSoon = async () => {
    const current = settings.coming_soon?.value || {};
    const next = { ...current, enabled: !current.enabled };
    await sb("site_settings?key=eq.coming_soon", { method: "PATCH", prefer: "return=minimal", body: JSON.stringify({ value: next }) });
    updateSettings("coming_soon", next);
    showToast(next.enabled ? "الموقع الآن في وضع Coming Soon" : "الموقع منشور الآن 🚀");
  };

  const addToCart = (p) => {
    setCart(c => { const ex = c.find(i => i.id===p.id); if(ex) return c.map(i=>i.id===p.id?{...i,qty:i.qty+1}:i); return [...c,{...p,qty:1}]; });
    setCartOpen(true);
    showToast(`تمت الإضافة للسلة ✓`);
  };
  const inc = id => setCart(c => c.map(i=>i.id===id?{...i,qty:i.qty+1}:i));
  const dec = id => setCart(c => c.map(i=>i.id===id?{...i,qty:Math.max(1,i.qty-1)}:i));
  const remove = id => setCart(c => c.filter(i=>i.id!==id));
  const cartCount = cart.reduce((s,i)=>s+i.qty,0);
  const cartTotal = cart.reduce((s,i)=>s+i.price*i.qty,0);

  // Show coming soon to non-admins
  if (comingSoon && !isAdmin) return (
    <>
      <style>{CSS}</style>
      <ComingSoon settings={settings} logoSrc={logoSrc} />
    </>
  );

  const sharedProps = { products, onAdd: addToCart, navigate, showToast };

  return (
    <>
      <style>{CSS}</style>
      <SiteHeader cartCount={cartCount} cartTotal={cartTotal} onCart={() => setCartOpen(true)} dark={dark} setDark={setDark} navigate={navigate} logoSrc={logoSrc} />

      {page === "home" && (
        <>
          <HeroA {...sharedProps} settings={settings} onUpdateSettings={updateSettings} editMode={editMode} />
          <TopSellingSection {...sharedProps} />
          <CategoriesSection products={products} />
          <DealBanners {...sharedProps} settings={settings} onUpdateSettings={updateSettings} editMode={editMode} />
          <CategoryRail catId="battery" num="04a" eyebrow="CORDLESS POWER" title="أدوات البطارية" desc="أحدث موديلات الدريلات والمناشير والمفاتيح اللاسلكية — بطاريات ليثيوم عالية الأداء وضمان الوكيل." {...sharedProps} />
          <CategoryRail catId="electric" num="04b" eyebrow="CORDED POWER" title="الأدوات الكهربائية" desc="آلات كهربائية للنجارة والحدادة والديكور — قوة مستمرة، أداء احترافي، موثوقية الاستخدام اليومي في الورش والمواقع." {...sharedProps} />
          <Section id="new" num="05" eyebrow="NEW ARRIVALS" title="وصل حديثاً" cta={{ label:"عرض كل الجديد", fn:()=>navigate("shop") }}>
            <div className="rail rail-4">{products.slice(-4).reverse().map(p=><ProductCard key={p.id} p={p} onAdd={addToCart} onNavigate={navigate} />)}</div>
          </Section>
          <BrandsSection settings={settings} />
          <ReviewsSection />
        </>
      )}
      {page === "shop" && <ShopPage {...sharedProps} initialCat={pageData?.category} />}
      {page === "product" && pageData?.product && <ProductDetailPage product={pageData.product} onAdd={addToCart} products={products} navigate={navigate} />}
      {page === "checkout" && <CheckoutPage cart={cart} navigate={navigate} setCart={setCart} products={products} setProducts={setProducts} showToast={showToast} />}
      {page === "confirmation" && <ConfirmationPage pageData={pageData} navigate={navigate} />}

      <SiteFooter logoSrc={logoSrc} />

      <CartDrawer open={cartOpen} items={cart} onClose={() => setCartOpen(false)} onInc={inc} onDec={dec} onRemove={remove} navigate={navigate} />

      {isAdmin && <EditBar editMode={editMode} setEditMode={setEditMode} comingSoon={comingSoon} toggleComingSoon={toggleComingSoon} />}

      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {isAdmin && <div style={{ height: 56 }} />}
    </>
  );
}
