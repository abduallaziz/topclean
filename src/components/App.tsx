"use client";
import { useState, useEffect, useRef, useCallback } from "react";

// ══════════════════════════════════════════════════════════
// 🔊 SOUND ENGINE
// ══════════════════════════════════════════════════════════
function useSound() {
  const ctx = useRef(null);
  function getCtx() {
    if (!ctx.current) {
      try { ctx.current = new (window.AudioContext || window.webkitAudioContext)(); } catch {}
    }
    return ctx.current;
  }
  function beep(freq = 520, dur = 0.08, type = "sine", vol = 0.15) {
    try {
      const c = getCtx(); if (!c) return;
      const o = c.createOscillator(), g = c.createGain();
      o.connect(g); g.connect(c.destination);
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(vol, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
      o.start(); o.stop(c.currentTime + dur);
    } catch {}
  }
  return {
    click:    () => beep(800, 0.06, "sine", 0.12),
    add:      () => beep(660, 0.10, "sine", 0.16),
    remove:   () => beep(300, 0.09, "triangle", 0.14),
    success:  () => { beep(523, 0.1); setTimeout(() => beep(659, 0.1), 110); setTimeout(() => beep(784, 0.14), 220); },
    checkout: () => { beep(880, 0.09, "sine", 0.2); setTimeout(() => beep(1046, 0.18, "sine", 0.2), 130); },
    warn:     () => beep(280, 0.18, "sawtooth", 0.14),
    queue:    () => { beep(440, 0.1); setTimeout(() => beep(554, 0.1), 130); },
    finish:   () => { beep(784, 0.08); setTimeout(() => beep(1046, 0.08), 100); setTimeout(() => beep(1318, 0.15), 200); },
    nav:      () => beep(600, 0.05, "sine", 0.09),
    delete:   () => beep(220, 0.12, "sawtooth", 0.13),
    drawer:   () => { beep(300, 0.08); setTimeout(() => beep(500, 0.1), 90); setTimeout(() => beep(700, 0.16), 180); },
    drawerClose: () => { beep(700, 0.08); setTimeout(() => beep(500, 0.08), 90); setTimeout(() => beep(300, 0.14), 180); },
  };
}

// ══════════════════════════════════════════════════════════
// 🗃️ INDEXEDDB
// ══════════════════════════════════════════════════════════
const DB_NAME = "TopCleanDB_v3";
function openDB() {
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      ["customers","orders","expenses","services","users","settings","workers","sessions"]
        .forEach(s => { if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: "id" }); });
    };
    req.onsuccess = e => res(e.target.result);
    req.onerror = () => rej(req.error);
  });
}
async function dbAll(store) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const req = db.transaction(store, "readonly").objectStore(store).getAll();
    req.onsuccess = () => res(req.result || []);
    req.onerror = () => rej(req.error);
  });
}
async function dbSet(store, item) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const req = db.transaction(store, "readwrite").objectStore(store).put(item);
    req.onsuccess = () => res();
    req.onerror = () => rej(req.error);
  });
}
async function dbDel(store, id) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const req = db.transaction(store, "readwrite").objectStore(store).delete(id);
    req.onsuccess = () => res();
    req.onerror = () => rej(req.error);
  });
}

// ══════════════════════════════════════════════════════════
// 📌 CONSTANTS & DEFAULTS
// ══════════════════════════════════════════════════════════
const DEF_SERVICES = [
  { id:"s1", name:"غسيل كامل",       price:40,  icon:"🚿", color:"#00c6ff", active:true, cat:"غسيل" },
  { id:"s2", name:"غسيل خارجي",      price:25,  icon:"💧", color:"#0072ff", active:true, cat:"غسيل" },
  { id:"s3", name:"غسيل بستم",       price:30,  icon:"✨", color:"#00c6ff", active:true, cat:"غسيل" },
  { id:"s4", name:"تلميع",           price:60,  icon:"💎", color:"#f5c842", active:true, cat:"تلميع" },
  { id:"s5", name:"تنظيف داخلي",    price:35,  icon:"🪣", color:"#22d3a0", active:true, cat:"داخلي" },
  { id:"s6", name:"إزالة الشحوم",   price:20,  icon:"🧴", color:"#22d3a0", active:true, cat:"داخلي" },
  { id:"s7", name:"باقة التلميع",   price:80,  icon:"⭐", color:"#f5c842", active:true, cat:"تلميع" },
  { id:"s8", name:"الباقة الذهبية", price:200, icon:"👑", color:"#f5c842", active:true, cat:"باقات" },
];
const DEF_WORKERS = [
  { id:"w1", name:"أحمد",  busy:false, done:0 },
  { id:"w2", name:"محمد",  busy:false, done:0 },
  { id:"w3", name:"سعد",   busy:false, done:0 },
  { id:"w4", name:"خالد",  busy:false, done:0 },
];
const DEF_USERS = [
  { id:"u1", name:"المدير العام",  username:"admin",  password:"1234", role:"admin",      active:true },
  { id:"u2", name:"أحمد الكاشير", username:"ahmed",  password:"0000", role:"cashier",    active:true },
  { id:"u3", name:"خالد المشرف",  username:"khalid", password:"0000", role:"supervisor", active:true },
];
const DEF_CFG = { id:"cfg", shopName:"TOP CLEAN", tax:15, phone:"0500000000", address:"الرياض، المملكة العربية السعودية" };

const ROLES = {
  admin:      { label:"مدير عام", color:"#f5c842", icon:"👑", perms:["pos","queue","orders","analytics","services","customers","expenses","workers","users","cashier_session","settings"] },
  supervisor: { label:"مشرف",    color:"#00c6ff", icon:"🔵", perms:["pos","queue","orders","analytics","services","customers","expenses","workers","cashier_session"] },
  cashier:    { label:"كاشير",   color:"#22d3a0", icon:"🟢", perms:["pos","queue","orders","customers","cashier_session"] },
};
const PAY_METHODS = [
  { id:"نقد",       icon:"💵", label:"نقد",       color:"#22d3a0" },
  { id:"فيزا",      icon:"💳", label:"فيزا",      color:"#00c6ff" },
  { id:"ماستر كارد",icon:"💳", label:"ماستر كارد",color:"#f5c842" },
  { id:"مدى",       icon:"🏧", label:"مدى",       color:"#ab47bc" },
];
const EXPENSE_CATS = ["رواتب","مواد تنظيف","كهرباء وماء","صيانة","إيجار","وقود","متفرقات"];
const CAR_TYPES    = ["سيدان","SUV","بيك أب","فان","دراجة نارية"];
const PERIODS      = [
  { id:"day", label:"اليوم", days:1 }, { id:"week", label:"الأسبوع", days:7 },
  { id:"month", label:"الشهر", days:30 }, { id:"quarter", label:"ربع سنة", days:90 },
  { id:"half", label:"نصف سنة", days:180 }, { id:"year", label:"سنة", days:365 },
];
const SVC_ICONS = ["💧","✨","⭐","💎","🔧","👑","🚗","🧹","🪣","🫧","🌟","🏆","🚿","🧴","🔵"];
const SVC_COLORS = ["#00c6ff","#0072ff","#f5c842","#22d3a0","#ff5f6d","#ab47bc","#ff7043","#26c6da"];

const C = {
  bg:"#0a0f1e", surface:"#111827", sl:"#1a2235", border:"#1e2d45",
  accent:"#00c6ff", ag:"rgba(0,198,255,.15)", ad:"rgba(0,198,255,.08)",
  gold:"#f5c842", gg:"rgba(245,200,66,.15)",
  green:"#22d3a0", gr:"rgba(34,211,160,.15)",
  red:"#ff5f6d", text:"#e2eaf6", dim:"#6b7a99", mid:"#99abc4",
};

const fmt      = n => `${Number(n || 0).toLocaleString("ar", { maximumFractionDigits: 0 })} ر.س`;
const todayStr = () => new Date().toLocaleDateString("ar-SA");
const timeStr  = () => new Date().toLocaleTimeString("ar-SA");
const daysAgo  = n => Date.now() - n * 86400000;
const uid      = p => `${p || ""}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`.toUpperCase();

function nextSeq(list, prefix, pad = 4) {
  if (!list.length) return `${prefix}${String(1).padStart(pad, "0")}`;
  const nums = list.map(i => { const m = String(i.id || "").match(/\d+$/); return m ? parseInt(m[0]) : 0; }).filter(Boolean);
  return `${prefix}${String(Math.max(...nums, 0) + 1).padStart(pad, "0")}`;
}

function speak(text) {
  try { const u = new SpeechSynthesisUtterance(text); u.lang = "ar-SA"; speechSynthesis.speak(u); } catch {}
}

// ══════════════════════════════════════════════════════════
// 🖨️ PRINT HTML BUILDER — works inside iframe
// ══════════════════════════════════════════════════════════
function buildReceiptHTML(order, cfg) {
  const pi = { "نقد":"💵","فيزا":"💳","ماستر كارد":"💳","مدى":"🏧" };
  const rows = (order.items || []).map(i =>
    `<tr><td>${i.icon || ""}${i.name}</td><td style="text-align:center">${i.qty}</td>
     <td style="text-align:left">${i.price} ر.س</td>
     <td style="text-align:left;font-weight:700">${(i.price * i.qty).toFixed(0)} ر.س</td></tr>`
  ).join("");
  return `
    <div class="hdr">
      <div class="shopname">🚗 ${cfg.shopName}</div>
      <div class="shopinfo">${cfg.address} | 📞 ${cfg.phone}</div>
      <div class="doctype">فاتورة ضريبية</div>
    </div>
    <div style="text-align:center;margin-bottom:14px">
      <div style="font-size:20px;font-weight:800;color:#0072ff">#${order.id}</div>
      <div style="font-size:12px;color:#666">${order.date} — ${order.time}</div>
      ${order.customerName ? `<div style="font-size:13px;font-weight:700;color:#005b9f;margin-top:5px">👤 ${order.customerName}${order.customerPhone ? " | " + order.customerPhone : ""}</div>` : ""}
    </div>
    <div class="info"><span class="lbl">اللوحة</span><span class="val">${order.carPlate} (${order.carType || ""})</span></div>
    <div class="info"><span class="lbl">الدفع</span><span class="val">${pi[order.payment] || ""}${order.payment}</span></div>
    <div class="info"><span class="lbl">الكاشير</span><span class="val">${order.cashier}</span></div>
    <hr/>
    <table><thead><tr><th>الخدمة</th><th style="text-align:center">الكمية</th><th style="text-align:left">السعر</th><th style="text-align:left">الإجمالي</th></tr></thead>
    <tbody>${rows}</tbody></table>
    <hr/>
    ${(order.discount || 0) > 0 ? `<div class="row"><span style="color:#555">خصم</span><span style="color:#2e7d32;font-weight:700">- ${order.discount.toFixed(0)} ر.س</span></div>` : ""}
    ${(order.tax || 0) > 0 ? `<div class="row"><span style="color:#555">ضريبة ${cfg.tax}%</span><span style="color:#c62828;font-weight:700">+ ${order.tax.toFixed(0)} ر.س</span></div>` : ""}
    <div class="total"><span>الإجمالي</span><span style="color:#0072ff">${order.total.toFixed(0)} ر.س</span></div>
    <div class="footer">شكراً لزيارتكم ✨<br/>${cfg.shopName} | 📞 ${cfg.phone}</div>`;
}

function buildReportHTML(type, data, cfg) {
  const { orders = [], expenses = [], payBreak = [], svcStats = [], period = "" } = data;
  const rev = orders.reduce((s, o) => s + o.total, 0);
  const exp = expenses.reduce((s, e) => s + e.amount, 0);
  const net = rev - exp;
  const oRows = orders.map((o, i) =>
    `<tr><td style="font-size:11px">${o.id}</td><td>${o.customerName || "—"}</td><td>${o.carPlate}</td><td>${o.payment}</td><td style="text-align:left;font-weight:700">${o.total.toFixed(0)} ر.س</td></tr>`
  ).join("");
  const pRows = payBreak.filter(p => p.count > 0).map(p =>
    `<tr><td>${p.icon}${p.label}</td><td style="text-align:center">${p.count}</td><td style="text-align:left;font-weight:700;color:#0077b6">${p.total.toFixed(0)} ر.س</td></tr>`
  ).join("");
  const sRows = svcStats.filter(s => s.cnt > 0).map(s =>
    `<tr><td>${s.icon || ""}${s.name}</td><td style="text-align:center">${s.cnt}</td><td style="text-align:left;font-weight:700">${s.rev.toFixed(0)} ر.س</td></tr>`
  ).join("");
  const eRows = expenses.map(e =>
    `<tr><td>${e.title}</td><td>${e.category}</td><td style="text-align:left;font-weight:700;color:#c62828">${e.amount.toFixed(0)} ر.س</td></tr>`
  ).join("");
  const title = type === "dayend" ? `تقرير نهاية اليوم — ${todayStr()}` : `تقرير ${period} — ${todayStr()}`;
  return `
    <div class="hdr"><div class="shopname">🚗 ${cfg.shopName}</div>
    <div class="shopinfo">${cfg.address} | 📞 ${cfg.phone}</div>
    <div class="doctype">${title}</div></div>
    <div class="sumbox">
      <div class="row2"><span>💰 إجمالي المبيعات</span><span style="color:#0077b6;font-weight:800">${rev.toFixed(0)} ر.س</span></div>
      <div class="row2"><span>🧾 عدد الفواتير</span><span style="color:#0077b6;font-weight:800">${orders.length}</span></div>
      <div class="row2"><span>💸 إجمالي المصروفات</span><span style="color:#c62828;font-weight:800">${exp.toFixed(0)} ر.س</span></div>
      <div class="row2 last"><span>📈 صافي الربح</span><span style="color:${net >= 0 ? "#2e7d32" : "#c62828"};font-weight:900;font-size:16px">${net.toFixed(0)} ر.س</span></div>
    </div>
    ${pRows ? `<div class="sec">💳 تفاصيل طرق الدفع</div>
    <table><thead><tr><th>طريقة الدفع</th><th style="text-align:center">الفواتير</th><th style="text-align:left">المبلغ</th></tr></thead>
    <tbody>${pRows}</tbody></table>` : ""}
    ${oRows ? `<div class="sec">📋 الفواتير (${orders.length})</div>
    <table><thead><tr><th>رقم</th><th>العميل</th><th>اللوحة</th><th>الدفع</th><th style="text-align:left">المبلغ</th></tr></thead>
    <tbody>${oRows}</tbody></table>` : ""}
    ${sRows ? `<div class="sec">🔧 أداء الخدمات</div>
    <table><thead><tr><th>الخدمة</th><th style="text-align:center">المرات</th><th style="text-align:left">الإيراد</th></tr></thead>
    <tbody>${sRows}</tbody></table>` : ""}
    ${eRows ? `<div class="sec">💸 المصروفات</div>
    <table><thead><tr><th>البند</th><th>الفئة</th><th style="text-align:left">المبلغ</th></tr></thead>
    <tbody>${eRows}</tbody></table>` : ""}
    <div class="footer">${cfg.shopName} | ${cfg.phone} | ${todayStr()} ${timeStr()}</div>`;
}

const PRINT_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Cairo',sans-serif;direction:rtl;background:#fff;color:#111;padding:20px}
  .hdr{text-align:center;border-bottom:2px dashed #ccc;padding-bottom:14px;margin-bottom:16px}
  .shopname{font-size:22px;font-weight:900;color:#0a0f2e}
  .shopinfo{font-size:11px;color:#555;margin-top:3px}
  .doctype{font-size:13px;font-weight:700;color:#0072ff;margin-top:6px}
  .info{display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px dashed #eee;font-size:13px}
  .lbl{color:#666}.val{font-weight:700}
  hr{border:none;border-top:1px solid #ddd;margin:10px 0}
  table{width:100%;border-collapse:collapse;margin:10px 0;font-size:12px}
  th{background:#e8f0fe;padding:7px 6px;text-align:right;border-bottom:2px solid #c5d5f5;font-weight:700}
  td{padding:6px;border-bottom:1px solid #eee}
  tr:nth-child(even) td{background:#fafbff}
  .row{display:flex;justify-content:space-between;padding:3px 0;font-size:13px}
  .total{display:flex;justify-content:space-between;font-size:20px;font-weight:900;border-top:3px solid #111;padding-top:10px;margin-top:8px}
  .footer{text-align:center;font-size:11px;color:#888;border-top:1px dashed #ccc;padding-top:12px;margin-top:16px}
  .sumbox{background:#f0f6ff;border:1px solid #cde;border-radius:8px;padding:12px;margin-bottom:14px}
  .row2{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #dde;font-size:14px}
  .row2.last{border-bottom:none}
  .sec{font-size:13px;font-weight:800;color:#333;margin:14px 0 8px}
  .print-btn{display:flex;justify-content:center;gap:12px;margin-top:20px;padding:14px;border-top:2px solid #eee}
  button.pbtn{padding:12px 28px;border:none;border-radius:10px;font-size:15px;font-weight:700;cursor:pointer;font-family:'Cairo',sans-serif}
  @media print{.print-btn{display:none!important};body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
`;

function wrapHTML(body, title) {
  return `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8">
    <title>${title}</title><style>${PRINT_CSS}</style></head>
    <body>${body}
    <div class="print-btn">
      <button class="pbtn" style="background:linear-gradient(135deg,#00c6ff,#0072ff);color:#fff" onclick="window.print()">🖨️ طباعة / حفظ PDF</button>
      <button class="pbtn" style="background:#f0f0f0;color:#333" onclick="window.close()">✕ إغلاق</button>
    </div>
    <p style="text-align:center;font-size:11px;color:#aaa;margin-top:8px">لحفظ PDF: اضغط طباعة ← اختر "Save as PDF"</p>
    </body></html>`;
}

// ══════════════════════════════════════════════════════════
// 📄 PRINT MODAL — shows inside app, works in sandbox
// ══════════════════════════════════════════════════════════
function PrintModal({ htmlContent, title, onClose, shareText }) {
  const iframeRef = useRef(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;
    doc.open();
    doc.write(htmlContent);
    doc.close();
  }, [htmlContent]);

  function handlePrint() {
    try {
      const iframe = iframeRef.current;
      if (iframe?.contentWindow) {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } else {
        // Fallback: open new window
        const w = window.open("", "_blank");
        if (w) { w.document.write(htmlContent); w.document.close(); setTimeout(() => w.print(), 500); }
      }
    } catch {
      // Last resort: download as html file
      const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${title}.html`;
      a.click();
    }
  }

  function handleShare() {
    if (!shareText) return;
    const doShare = () => {
      if (navigator.share) {
        navigator.share({ title, text: shareText }).catch(() => doCopy());
      } else { doCopy(); }
    };
    const doCopy = () => {
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(shareText).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); }).catch(() => legacyCopy());
      } else { legacyCopy(); }
    };
    const legacyCopy = () => {
      const ta = document.createElement("textarea");
      ta.value = shareText; ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;width:1px;height:1px";
      document.body.appendChild(ta); ta.focus(); ta.select();
      try { document.execCommand("copy"); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch {}
      document.body.removeChild(ta);
    };
    doShare();
  }

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.92)", zIndex:300, display:"flex", flexDirection:"column" }}>
      {/* Top bar */}
      <div style={{ background:C.sl, padding:"10px 14px", display:"flex", gap:8, alignItems:"center", borderBottom:`1px solid ${C.border}`, flexShrink:0 }}>
        <span style={{ fontSize:13, fontWeight:700, color:C.text, flex:1 }}>📄 {title}</span>
        <button onClick={handlePrint} style={{ padding:"8px 16px", background:`linear-gradient(135deg,${C.accent},#0072ff)`, border:"none", borderRadius:9, color:"#fff", fontSize:13, fontWeight:700, fontFamily:"inherit", cursor:"pointer" }}>
          🖨️ طباعة / PDF
        </button>
        {shareText && (
          <button onClick={handleShare} style={{ padding:"8px 16px", background:copied?`linear-gradient(135deg,${C.green},#00a67e)`:`linear-gradient(135deg,#22d3a0,#00a67e)`, border:"none", borderRadius:9, color:"#fff", fontSize:13, fontWeight:700, fontFamily:"inherit", cursor:"pointer" }}>
            {copied ? "✅ تم النسخ!" : "📤 مشاركة / نسخ"}
          </button>
        )}
        <button onClick={onClose} style={{ padding:"8px 12px", background:"rgba(255,95,109,.15)", border:`1px solid rgba(255,95,109,.3)`, borderRadius:9, color:C.red, fontSize:13, fontFamily:"inherit", cursor:"pointer" }}>✕</button>
      </div>
      {/* Iframe preview */}
      <iframe
        ref={iframeRef}
        style={{ flex:1, border:"none", background:"#fff" }}
        title={title}
        sandbox="allow-same-origin allow-scripts allow-modals allow-popups"
      />
      <div style={{ padding:"8px 14px", background:C.sl, borderTop:`1px solid ${C.border}`, fontSize:11, color:C.dim, textAlign:"center" }}>
        💡 اضغط 🖨️ ثم اختر "Save as PDF" لحفظ ملف PDF
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// 🏠 MAIN APP
// ══════════════════════════════════════════════════════════
export default function App() {
  const SFX = useSound();

  // DB State
  const [customers,  setCustomers]  = useState([]);
  const [orders,     setOrders]     = useState([]);
  const [expenses,   setExpenses]   = useState([]);
  const [services,   setServices]   = useState([]);
  const [users,      setUsers]      = useState([]);
  const [workers,    setWorkers]    = useState(DEF_WORKERS);
  const [sessions,   setSessions]   = useState([]);
  const [cfg,        setCfg]        = useState(DEF_CFG);
  const [ready,      setReady]      = useState(false);

  // App State
  const [session,    setSession]    = useState(null);
  const [tab,        setTab]        = useState("pos");
  const [toast,      setToast]      = useState(null);
  const [time,       setTime]       = useState(new Date());

  // Print Modal
  const [printModal, setPrintModal] = useState(null); // { html, title, shareText }

  // Modals
  const [receipt,    setReceipt]    = useState(null);
  const [editSvc,    setEditSvc]    = useState(null);
  const [editUser,   setEditUser]   = useState(null);
  const [editExp,    setEditExp]    = useState(null);
  const [editWrk,    setEditWrk]    = useState(null);
  const [editCfg,    setEditCfg]    = useState(false);
  const [editCust,   setEditCust]   = useState(null);
  const [viewCust,   setViewCust]   = useState(null);
  const [dayEnd,     setDayEnd]     = useState(false);

  // Queue
  const [queue,      setQueue]      = useState([]);

  // Checkout
  const [cart,       setCart]       = useState([]);
  const [discount,   setDiscount]   = useState(0);
  const [step,       setStep]       = useState(null); // null | "pay" | "cust"
  const [payMethod,  setPayMethod]  = useState("نقد");
  const [coName,     setCoName]     = useState("");
  const [coPhone,    setCoPhone]    = useState("");
  const [coPlate,    setCoPlate]    = useState("");
  const [coType,     setCoType]     = useState("سيدان");
  const [coSearch,   setCoSearch]   = useState("");
  const [coFound,    setCoFound]    = useState(null);

  // Session
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeSession, setActiveSession] = useState(null);
  const [openAmt,    setOpenAmt]    = useState("");
  const [closeModal, setCloseModal] = useState(false);
  const [closeNote,  setCloseNote]  = useState("");

  // Filters
  const [period,     setPeriod]     = useState("month");
  const [ordFilter,  setOrdFilter]  = useState("today");
  const [ordQ,       setOrdQ]       = useState("");
  const [custQ,      setCustQ]      = useState("");

  // Clock
  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t); }, []);

  // Load DB
  useEffect(() => {
    (async () => {
      try {
        const [c, o, ex, sv, us, st, wk, se] = await Promise.all([
          dbAll("customers"), dbAll("orders"), dbAll("expenses"),
          dbAll("services"),  dbAll("users"),  dbAll("settings"),
          dbAll("workers"),   dbAll("sessions"),
        ]);
        setCustomers(c);
        setOrders(o.sort((a, b) => b.ts - a.ts));
        setExpenses(ex.sort((a, b) => (b.ts || 0) - (a.ts || 0)));
        setServices(sv.length ? sv : DEF_SERVICES);
        setUsers(us.length ? us : DEF_USERS);
        setWorkers(wk.length ? wk : DEF_WORKERS);
        setSessions(se.sort((a, b) => b.openTs - a.openTs));
        const c2 = st.find(s => s.id === "cfg") || DEF_CFG;
        setCfg(c2);
        const open = se.find(s => !s.closeTime);
        if (open) { setActiveSession(open); setDrawerOpen(true); }
        if (!sv.length) await Promise.all(DEF_SERVICES.map(s => dbSet("services", s)));
        if (!us.length) await Promise.all(DEF_USERS.map(u => dbSet("users", u)));
        if (!wk.length) await Promise.all(DEF_WORKERS.map(w => dbSet("workers", w)));
        if (!st.find(s => s.id === "cfg")) await dbSet("settings", DEF_CFG);
      } catch (e) { console.error(e); }
      setReady(true);
    })();
  }, []);

  const toast$ = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 2600); };
  const can = p => session && ROLES[session.role]?.perms.includes(p);

  // ── CART ──────────────────────────────────────────────
  const subtotal    = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const discountAmt = Math.min(Number(discount) || 0, subtotal);
  const taxAmt      = ((subtotal - discountAmt) * cfg.tax) / 100;
  const total       = subtotal - discountAmt + taxAmt;

  const addToCart  = s => { SFX.add(); setCart(p => { const ex = p.find(i => i.id === s.id); return ex ? p.map(i => i.id === s.id ? { ...i, qty: i.qty + 1 } : i) : [...p, { ...s, qty: 1 }]; }); };
  const changeQty  = (id, d) => { d > 0 ? SFX.add() : SFX.remove(); setCart(p => p.map(i => i.id === id ? { ...i, qty: Math.max(1, i.qty + d) } : i)); };
  const removeItem = id => { SFX.delete(); setCart(p => p.filter(i => i.id !== id)); };
  const clearCart  = () => { setCart([]); setDiscount(0); setPayMethod("نقد"); setCoName(""); setCoPhone(""); setCoPlate(""); setCoType("سيدان"); setCoFound(null); setCoSearch(""); };

  function searchCust(q) {
    setCoSearch(q);
    if (q.length < 3) { setCoFound(null); return; }
    const f = customers.find(c => c.phone === q || (c.vehicles || []).some(v => v.plate.toLowerCase() === q.toLowerCase()));
    if (f) { setCoFound(f); setCoPhone(f.phone || ""); setCoName(f.name || ""); SFX.success(); }
    else setCoFound(null);
  }

  // ── CHECKOUT ─────────────────────────────────────────
  async function finalCheckout() {
    if (!coPlate.trim()) { toast$("⚠️ أدخل رقم اللوحة", "warn"); SFX.warn(); return; }
    let cust = coFound || (coPhone.trim() ? customers.find(c => c.phone === coPhone.trim()) : null);
    if (!cust) {
      const newId = nextSeq(customers, "CUS");
      cust = { id: newId, name: coName.trim() || `عميل ${newId}`, phone: coPhone.trim(), vehicles: [{ plate: coPlate.trim().toUpperCase(), type: coType }], totalOrders: 0, totalSpent: 0, createdAt: todayStr(), ts: Date.now() };
      await dbSet("customers", cust); setCustomers(p => [cust, ...p]);
      toast$(`⚡ تمت إضافة العميل: ${newId}`);
    } else {
      const exists = (cust.vehicles || []).find(v => v.plate.toUpperCase() === coPlate.trim().toUpperCase());
      cust = { ...cust, vehicles: exists ? cust.vehicles : [...(cust.vehicles || []), { plate: coPlate.trim().toUpperCase(), type: coType }] };
      await dbSet("customers", cust); setCustomers(p => p.map(c => c.id === cust.id ? cust : c));
    }
    const ordId = nextSeq(orders, "ORD");
    const ord = { id: ordId, items: [...cart], subtotal, discount: discountAmt, tax: taxAmt, total, carPlate: coPlate.trim().toUpperCase(), carType: coType, payment: payMethod, cashier: session.name, customerId: cust.id, customerName: cust.name, customerPhone: cust.phone, date: todayStr(), time: timeStr(), ts: Date.now(), sessionId: activeSession?.id || null };
    await dbSet("orders", ord); setOrders(p => [ord, ...p]);
    const upd = { ...cust, totalOrders: (cust.totalOrders || 0) + 1, totalSpent: (cust.totalSpent || 0) + total, lastVisit: todayStr() };
    await dbSet("customers", upd); setCustomers(p => p.map(c => c.id === upd.id ? upd : c));
    setStep(null); clearCart(); setReceipt(ord);
    SFX.checkout(); toast$("✅ تم إصدار الفاتورة!");
  }

  // ── QUEUE ────────────────────────────────────────────
  function addQueue() {
    const n = queue.length + 1;
    const num = "A" + String(n).padStart(2, "0");
    setQueue(p => [...p, { id: Date.now(), num, status: "waiting", workerId: null }]);
    speak("رقم " + num); SFX.queue(); toast$("🚗 " + num + " — تمت الإضافة");
  }
  function autoAssign() {
    const car = queue.find(c => c.status === "waiting");
    const wrk = workers.find(w => !w.busy);
    if (!car || !wrk) { toast$("⚠️ لا يوجد سيارة أو عامل متاح", "warn"); SFX.warn(); return; }
    setQueue(p => p.map(c => c.id === car.id ? { ...c, status: "serving", workerId: wrk.id } : c));
    setWorkers(p => p.map(w => w.id === wrk.id ? { ...w, busy: true } : w));
    speak("رقم " + car.num + " توجه للعامل " + wrk.name);
    SFX.success(); toast$(`🔧 ${car.num} ← ${wrk.name}`);
  }
  async function finishCar(car) {
    setQueue(p => p.filter(c => c.id !== car.id));
    const upd = workers.map(w => w.id === car.workerId ? { ...w, busy: false, done: (w.done || 0) + 1 } : w);
    setWorkers(upd); await Promise.all(upd.map(w => dbSet("workers", w)));
    speak("تم الانتهاء"); SFX.finish(); toast$("✔️ تم إنهاء الخدمة");
  }

  // ── DRAWER ────────────────────────────────────────────
  async function openDrawer() {
    if (!openAmt && openAmt !== "0") { toast$("⚠️ أدخل رصيد الافتتاح", "warn"); return; }
    const sess = { id: uid("SES"), cashier: session.name, date: todayStr(), openTime: timeStr(), openTs: Date.now(), openAmount: Number(openAmt) || 0, closeTime: null, closeTs: null, note: "" };
    await dbSet("sessions", sess);
    setSessions(p => [sess, ...p]); setActiveSession(sess); setDrawerOpen(true); setOpenAmt("");
    SFX.drawer(); toast$("🟢 تم فتح الصندوق"); speak("تم فتح الصندوق");
  }
  async function closeDrawer() {
    if (!activeSession) return;
    const sessOrders = orders.filter(o => o.sessionId === activeSession.id);
    const sales = sessOrders.reduce((s, o) => s + o.total, 0);
    const upd = { ...activeSession, closeTime: timeStr(), closeTs: Date.now(), closeAmount: sales + activeSession.openAmount, sales, ordersCount: sessOrders.length, note: closeNote };
    await dbSet("sessions", upd);
    setSessions(p => p.map(s => s.id === upd.id ? upd : s));
    setActiveSession(null); setDrawerOpen(false); setCloseModal(false); setCloseNote("");
    SFX.drawerClose(); toast$("🔴 تم إغلاق الصندوق"); speak("تم إغلاق الصندوق");
    setDayEnd(true);
  }

  // ── PRINT HELPERS ────────────────────────────────────
  function printReceipt(ord) {
    const body = buildReceiptHTML(ord, cfg);
    const html = wrapHTML(body, `فاتورة #${ord.id}`);
    const shareText = `🚗 ${cfg.shopName}\n🧾 فاتورة #${ord.id}\n🚗 ${ord.carPlate}\n${PAY_METHODS.find(p => p.id === ord.payment)?.icon || ""}${ord.payment}\n💰 ${ord.total.toFixed(0)} ر.س\n${ord.customerName ? "👤 " + ord.customerName : ""}\n⏰ ${ord.date} ${ord.time}`;
    setPrintModal({ html, title: `فاتورة #${ord.id}`, shareText });
  }

  function printDayReport(type = "dayend") {
    const todayOrds = orders.filter(o => o.date === todayStr());
    const todayExps = expenses.filter(e => e.date === todayStr());
    const payBreak = PAY_METHODS.map(pm => ({ ...pm, count: todayOrds.filter(o => o.payment === pm.id).length, total: todayOrds.filter(o => o.payment === pm.id).reduce((s, o) => s + o.total, 0) }));
    const pDays = PERIODS.find(p => p.id === period)?.days || 30;
    const pOrds = orders.filter(o => o.ts >= daysAgo(pDays));
    const svcStats = services.map(s => ({ ...s, cnt: pOrds.reduce((n, o) => { const it = o.items.find(i => i.id === s.id); return n + (it ? it.qty : 0); }, 0), rev: pOrds.reduce((n, o) => { const it = o.items.find(i => i.id === s.id); return n + (it ? it.price * it.qty : 0); }, 0) })).filter(s => s.cnt > 0).sort((a, b) => b.rev - a.rev);
    const body = buildReportHTML(type, { orders: todayOrds, expenses: todayExps, payBreak, svcStats, period: PERIODS.find(p => p.id === period)?.label || "" }, cfg);
    const html = wrapHTML(body, type === "dayend" ? `تقرير نهاية اليوم — ${todayStr()}` : `تقرير اليوم`);
    const rev = todayOrds.reduce((s, o) => s + o.total, 0);
    const exp = todayExps.reduce((s, e) => s + e.amount, 0);
    const shareText = [`🚗 ${cfg.shopName}`, `📊 تقرير اليوم — ${todayStr()}`, `━━━━━━━━━`, `💰 المبيعات: ${rev.toFixed(0)} ر.س`, `🧾 الفواتير: ${todayOrds.length}`, `💸 المصروفات: ${exp.toFixed(0)} ر.س`, `📈 صافي الربح: ${(rev - exp).toFixed(0)} ر.س`, ``, `💳 تفاصيل الدفع:`, ...payBreak.filter(p => p.count > 0).map(p => `  ${p.icon}${p.label}: ${p.total.toFixed(0)} ر.س (${p.count})`), `⏰ ${timeStr()}`].join("\n");
    setPrintModal({ html, title: `تقرير اليوم — ${todayStr()}`, shareText });
  }

  function printPeriodReport() {
    const pLabel = PERIODS.find(p => p.id === period)?.label || period;
    const pDays = PERIODS.find(p => p.id === period)?.days || 30;
    const pOrds = orders.filter(o => o.ts >= daysAgo(pDays));
    const pExps = expenses.filter(e => (e.ts || 0) >= daysAgo(pDays));
    const svcStats = services.map(s => ({ ...s, cnt: pOrds.reduce((n, o) => { const it = o.items.find(i => i.id === s.id); return n + (it ? it.qty : 0); }, 0), rev: pOrds.reduce((n, o) => { const it = o.items.find(i => i.id === s.id); return n + (it ? it.price * it.qty : 0); }, 0) })).filter(s => s.cnt > 0).sort((a, b) => b.rev - a.rev);
    const body = buildReportHTML("period", { orders: pOrds, expenses: pExps, payBreak: [], svcStats, period: pLabel }, cfg);
    const html = wrapHTML(body, `تقرير ${pLabel}`);
    const rev = pOrds.reduce((s, o) => s + o.total, 0), exp = pExps.reduce((s, e) => s + e.amount, 0);
    const shareText = [`🚗 ${cfg.shopName}`, `📊 تقرير ${pLabel} — ${todayStr()}`, `━━━━━━━━━`, `💰 المبيعات: ${rev.toFixed(0)} ر.س`, `🧾 الطلبات: ${pOrds.length}`, `💸 المصروفات: ${exp.toFixed(0)} ر.س`, `📈 صافي الربح: ${(rev - exp).toFixed(0)} ر.س`, `⏰ ${timeStr()}`].join("\n");
    setPrintModal({ html, title: `تقرير ${pLabel}`, shareText });
  }

  // ── STATS ────────────────────────────────────────────
  const pDays   = PERIODS.find(p => p.id === period)?.days || 30;
  const pOrders = orders.filter(o => o.ts >= daysAgo(pDays));
  const pExps   = expenses.filter(e => (e.ts || 0) >= daysAgo(pDays));
  const pRev    = pOrders.reduce((s, o) => s + o.total, 0);
  const pExp    = pExps.reduce((s, e) => s + e.amount, 0);
  const pNet    = pRev - pExp;
  const todayOrders = orders.filter(o => o.date === todayStr());
  const todayRev    = todayOrders.reduce((s, o) => s + o.total, 0);
  const todayExp    = expenses.filter(e => e.date === todayStr()).reduce((s, e) => s + e.amount, 0);
  const totalRev    = orders.reduce((s, o) => s + o.total, 0);
  const totalExp    = expenses.reduce((s, e) => s + e.amount, 0);

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - i);
    const k = d.toLocaleDateString("ar-SA"), lbl = d.toLocaleDateString("ar-SA", { weekday: "short" });
    return { lbl, rev: orders.filter(o => o.date === k).reduce((s, o) => s + o.total, 0), exp: expenses.filter(e => e.date === k).reduce((s, e) => s + e.amount, 0) };
  }).reverse();
  const maxBar = Math.max(...last7.map(d => Math.max(d.rev, d.exp)), 1);

  const svcStats = services.map(s => ({
    ...s,
    cnt: pOrders.reduce((n, o) => { const it = o.items.find(i => i.id === s.id); return n + (it ? it.qty : 0); }, 0),
    rev: pOrders.reduce((n, o) => { const it = o.items.find(i => i.id === s.id); return n + (it ? it.price * it.qty : 0); }, 0),
  })).map(s => ({ ...s, share: pRev ? s.rev / pRev * 100 : 0 })).sort((a, b) => b.rev - a.rev);

  const todayPayBreakdown = PAY_METHODS.map(pm => ({
    ...pm,
    count: todayOrders.filter(o => o.payment === pm.id).length,
    total: todayOrders.filter(o => o.payment === pm.id).reduce((s, o) => s + o.total, 0),
  }));

  const filteredOrders = orders.filter(o => {
    const matchDate = ordFilter === "today" ? o.date === todayStr() : ordFilter === "week" ? o.ts >= daysAgo(7) : ordFilter === "month" ? o.ts >= daysAgo(30) : true;
    const q = ordQ.toLowerCase();
    return matchDate && (!q || o.id?.toLowerCase().includes(q) || o.carPlate?.toLowerCase().includes(q) || o.customerName?.toLowerCase().includes(q));
  });

  const filteredCusts = customers.filter(c => {
    const q = custQ.toLowerCase();
    return !q || c.name?.toLowerCase().includes(q) || c.phone?.includes(q) || c.id?.toLowerCase().includes(q) || (c.vehicles || []).some(v => v.plate?.toLowerCase().includes(q));
  });

  const waitingCount = queue.filter(c => c.status === "waiting").length;
  const servingCount = queue.filter(c => c.status === "serving").length;

  // ── SESSION STATS ────────────────────────────────────
  const sessOrders = activeSession ? orders.filter(o => o.sessionId === activeSession.id) : [];
  const sessSales  = sessOrders.reduce((s, o) => s + o.total, 0);
  const sessPayBreak = PAY_METHODS.map(pm => ({ ...pm, count: sessOrders.filter(o => o.payment === pm.id).length, total: sessOrders.filter(o => o.payment === pm.id).reduce((s, o) => s + o.total, 0) }));

  if (!ready) return (
    <div style={{ background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Cairo',sans-serif", color: C.accent, fontSize: 18, direction: "rtl" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@700&display=swap')`}</style>
      <div style={{ textAlign: "center" }}><div style={{ fontSize: 48, marginBottom: 16 }}>🚗</div>جاري تحميل قاعدة البيانات...</div>
    </div>
  );
  if (!session) return <LoginScreen users={users} onLogin={u => { SFX.success(); setSession(u); }} SFX={SFX} />;

  const NAV = [
    { id: "pos",             icon: "💳", label: "الكاشير",    perm: "pos" },
    { id: "queue",           icon: "🚗", label: "الطابور",    perm: "queue" },
    { id: "cashier_session", icon: "🟢", label: "الصندوق",    perm: "cashier_session" },
    { id: "orders",          icon: "📋", label: "الطلبات",    perm: "orders" },
    { id: "dashboard",       icon: "📊", label: "الرئيسية",  perm: "orders" },
    { id: "analytics",       icon: "📈", label: "التحليل",   perm: "analytics" },
    { id: "customers",       icon: "👤", label: "العملاء",   perm: "customers" },
    { id: "expenses",        icon: "💸", label: "المصروفات", perm: "expenses" },
    { id: "services",        icon: "⚙️", label: "الخدمات",   perm: "services" },
    { id: "workers",         icon: "👷", label: "العمال",    perm: "workers" },
    { id: "users",           icon: "🔐", label: "المستخدمون",perm: "users" },
    { id: "settings",        icon: "⚙️", label: "الإعدادات", perm: "settings" },
  ].filter(n => can(n.perm));

  return (
    <div style={{ fontFamily: "'Cairo','Tajawal',sans-serif", direction: "rtl", background: C.bg, minHeight: "100vh", color: C.text, maxWidth: 480, margin: "0 auto" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:#1e2d45;border-radius:3px}
        .hvr:hover{transform:scale(1.025);box-shadow:0 6px 20px rgba(0,198,255,.18)}
        .bp:active{transform:scale(.96)}
        select option{background:#111827} input::placeholder{color:#3d5169}
      `}</style>

      {/* Print Modal */}
      {printModal && <PrintModal htmlContent={printModal.html} title={printModal.title} shareText={printModal.shareText} onClose={() => setPrintModal(null)} />}

      {/* Toast */}
      {toast && <div style={{ position: "fixed", top: 80, left: "50%", transform: "translateX(-50%)", background: toast.type === "warn" ? "#1a1500" : "#001a14", border: `1px solid ${toast.type === "warn" ? C.gold : C.green}`, color: toast.type === "warn" ? C.gold : C.green, padding: "10px 24px", borderRadius: 14, fontSize: 13, fontWeight: 700, zIndex: 290, whiteSpace: "nowrap", boxShadow: "0 8px 30px rgba(0,0,0,.6)" }}>{toast.msg}</div>}

      {/* ── CHECKOUT STEP 1: PAYMENT ── */}
      {step === "pay" && (
        <div style={M.overlay}>
          <div style={M.box}>
            {/* Summary */}
            <div style={{ background: C.ad, border: `1px solid rgba(0,198,255,.15)`, borderRadius: 12, padding: "12px 14px", marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: C.dim, marginBottom: 6 }}>ملخص الطلب</div>
              {cart.map(i => (<div key={i.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "2px 0" }}><span>{i.icon}{i.name} × {i.qty}</span><span style={{ color: C.accent, fontWeight: 700 }}>{fmt(i.price * i.qty)}</span></div>))}
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 12, color: C.dim }}>خصم:</span>
                <input style={{ ...M.inp, flex: 1 }} type="number" min="0" placeholder="0" value={discount || ""} onChange={e => setDiscount(e.target.value)} />
                <span style={{ fontSize: 11, color: C.dim }}>ر.س</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                <span style={{ fontSize: 13, color: C.dim }}>ضريبة {cfg.tax}%</span><span style={{ color: C.red, fontWeight: 700 }}>+{fmt(taxAmt)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 800 }}>الإجمالي</span>
                <span style={{ fontSize: 22, fontWeight: 900, color: C.gold }}>{fmt(total)}</span>
              </div>
            </div>
            <div style={{ fontSize: 14, fontWeight: 800, textAlign: "center", marginBottom: 14 }}>💳 طريقة الدفع</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
              {PAY_METHODS.map(({ id, icon, label, color }) => (
                <div key={id} className="bp" onClick={() => { SFX.click(); setPayMethod(id); }} style={{ padding: "15px 10px", borderRadius: 13, textAlign: "center", cursor: "pointer", border: payMethod === id ? `2px solid ${color}` : `1px solid ${C.border}`, background: payMethod === id ? `${color}18` : C.surface }}>
                  <div style={{ fontSize: 24, marginBottom: 4 }}>{icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: payMethod === id ? color : C.text }}>{label}</div>
                  {payMethod === id && <div style={{ marginTop: 4, color: C.green }}>✅</div>}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 9 }}>
              <button className="bp" style={M.primaryBtn} onClick={() => { SFX.click(); setStep("cust"); }}>التالي ← بيانات العميل</button>
              <button style={M.secBtn} onClick={() => { SFX.click(); setStep(null); }}>رجوع</button>
            </div>
          </div>
        </div>
      )}

      {/* ── CHECKOUT STEP 2: CUSTOMER ── */}
      {step === "cust" && (
        <div style={M.overlay}>
          <div style={M.box}>
            <div style={{ fontSize: 14, fontWeight: 800, textAlign: "center", marginBottom: 4 }}>📋 بيانات العميل</div>
            <div style={{ fontSize: 11, color: C.dim, textAlign: "center", marginBottom: 12 }}>يُضاف تلقائياً إذا لم يكن موجوداً</div>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
              <span style={{ padding: "4px 14px", borderRadius: 18, background: C.ad, border: `1px solid rgba(0,198,255,.25)`, fontSize: 12, color: C.accent, fontWeight: 700 }}>
                {PAY_METHODS.find(p => p.id === payMethod)?.icon}{payMethod} — {fmt(total)}
              </span>
            </div>
            {/* Search */}
            <div style={{ marginBottom: 12 }}>
              <Lbl t="🔍 ابحث بالجوال أو اللوحة" />
              <input style={M.inp} placeholder="05xxxxxxxx أو رقم اللوحة" value={coSearch} onChange={e => searchCust(e.target.value)} />
              {coFound && (
                <div style={{ marginTop: 7, padding: "9px 12px", background: "rgba(34,211,160,.08)", border: "1px solid rgba(34,211,160,.25)", borderRadius: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.green }}>✅ {coFound.name} ({coFound.id})</div>
                  <div style={{ display: "flex", gap: 5, marginTop: 5, flexWrap: "wrap" }}>
                    {(coFound.vehicles || []).map((v, i) => (<span key={i} onClick={() => { SFX.click(); setCoPlate(v.plate); }} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 7, background: coPlate === v.plate ? C.ad : C.sl, border: coPlate === v.plate ? `1px solid ${C.accent}` : `1px solid ${C.border}`, cursor: "pointer", color: coPlate === v.plate ? C.accent : C.text }}>🚗 {v.plate}</span>))}
                  </div>
                </div>
              )}
            </div>
            <div style={{ marginBottom: 10 }}><Lbl t="الاسم (اختياري)" /><input style={M.inp} placeholder="اسم العميل" value={coName} onChange={e => setCoName(e.target.value)} /></div>
            <div style={{ marginBottom: 10 }}><Lbl t="📞 رقم الجوال" /><input style={{ ...M.inp, direction: "ltr", textAlign: "right" }} placeholder="05xxxxxxxx" value={coPhone} onChange={e => setCoPhone(e.target.value)} inputMode="tel" /></div>
            <div style={{ marginBottom: 14 }}>
              <Lbl t={<>🚗 رقم اللوحة <span style={{ color: C.red }}>*</span></>} />
              <div style={{ display: "flex", gap: 8 }}>
                <input style={{ ...M.inp, flex: 2, direction: "ltr", textAlign: "right" }} placeholder="ABC 1234" value={coPlate} onChange={e => setCoPlate(e.target.value.toUpperCase())} />
                <select style={{ ...M.sel, flex: 1 }} value={coType} onChange={e => setCoType(e.target.value)}>
                  {CAR_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
            {(coPhone || coPlate) && (
              <div style={{ padding: "9px 12px", background: C.ad, border: `1px solid rgba(0,198,255,.15)`, borderRadius: 9, marginBottom: 12, fontSize: 12 }}>
                {coPlate && <div>🚗 <span style={{ color: C.accent, fontWeight: 700 }}>{coPlate}</span></div>}
                {coPhone && <div>📞 <span style={{ color: C.accent, fontWeight: 700 }}>{coPhone}</span></div>}
                {!coFound && coPhone && <div style={{ color: C.gold, marginTop: 4 }}>⚡ سيُضاف كعميل جديد تلقائياً</div>}
              </div>
            )}
            <div style={{ display: "flex", gap: 9 }}>
              <button className="bp" style={{ ...M.primaryBtn, background: `linear-gradient(135deg,${C.green},#00a67e)`, boxShadow: `0 4px 14px ${C.gr}` }} onClick={() => { SFX.checkout(); finalCheckout(); }}>
                ✅ إصدار الفاتورة — {fmt(total)}
              </button>
              <button style={M.secBtn} onClick={() => { SFX.click(); setStep("pay"); }}>رجوع</button>
            </div>
          </div>
        </div>
      )}

      {/* ── CLOSE DRAWER MODAL ── */}
      {closeModal && (
        <div style={M.overlay}>
          <div style={M.box}>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.red, textAlign: "center", marginBottom: 14 }}>🔴 إغلاق الصندوق</div>
            <div style={{ background: C.sl, border: `1px solid ${C.border}`, borderRadius: 12, padding: "13px", marginBottom: 14 }}>
              {[["الكاشير", activeSession?.cashier], ["وقت الفتح", activeSession?.openTime, C.green], ["رصيد الافتتاح", fmt(activeSession?.openAmount || 0), C.gold], ["عدد الفواتير", sessOrders.length, C.accent], ["المبيعات", fmt(sessSales), C.green], ["الرصيد الكلي", fmt(sessSales + (activeSession?.openAmount || 0)), C.gold]].map(([l, v, c], i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: i < 5 ? `1px solid ${C.border}` : "none", fontSize: i === 5 ? 15 : 13, fontWeight: i === 5 ? 900 : 400 }}>
                  <span style={{ color: C.dim }}>{l}</span><span style={{ color: c || C.text, fontWeight: 700 }}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ marginBottom: 12 }}><Lbl t="ملاحظة الإغلاق (اختياري)" /><input style={M.inp} value={closeNote} onChange={e => setCloseNote(e.target.value)} placeholder="أي ملاحظات..." /></div>
            <div style={{ display: "flex", gap: 9 }}>
              <button className="bp" style={{ flex: 2, padding: "12px", background: `linear-gradient(135deg,${C.red},#c0392b)`, border: "none", borderRadius: 12, color: "#fff", fontSize: 14, fontWeight: 700, fontFamily: "inherit", cursor: "pointer" }} onClick={closeDrawer}>🔴 تأكيد الإغلاق</button>
              <button style={M.secBtn} onClick={() => setCloseModal(false)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* ── DAY END MODAL ── */}
      {dayEnd && (
        <div style={{ ...M.overlay, zIndex: 150 }}>
          <div style={{ ...M.box, maxWidth: 400, maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ fontSize: 16, fontWeight: 900, color: C.gold, textAlign: "center", marginBottom: 4 }}>📊 تقرير نهاية اليوم</div>
            <div style={{ fontSize: 12, color: C.dim, textAlign: "center", marginBottom: 14 }}>{todayStr()}</div>
            <div style={{ background: C.sl, border: `1px solid ${C.border}`, borderRadius: 12, padding: "13px", marginBottom: 12 }}>
              {[["💰 إجمالي المبيعات", fmt(todayRev), C.accent], ["🧾 عدد الفواتير", todayOrders.length, C.green], ["💸 المصروفات", fmt(todayExp), C.red], ["📈 صافي الربح", fmt(todayRev - todayExp), (todayRev - todayExp) >= 0 ? C.green : C.red]].map(([l, v, c], i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: i < 3 ? `1px solid ${C.border}` : "none" }}>
                  <span style={{ fontSize: 13, color: C.dim }}>{l}</span><span style={{ fontSize: 14, fontWeight: 800, color: c }}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ background: C.sl, border: `1px solid ${C.border}`, borderRadius: 12, padding: "10px 12px", marginBottom: 14 }}>
              {todayPayBreakdown.map(p => (<div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${C.border}`, fontSize: 12 }}><span>{p.icon}{p.label}</span><span style={{ color: C.dim }}>{p.count} فاتورة</span><span style={{ color: p.color, fontWeight: 700 }}>{fmt(p.total)}</span></div>))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginBottom: 9 }}>
              <button className="bp" style={{ padding: "12px", background: `linear-gradient(135deg,${C.accent},#0072ff)`, border: "none", borderRadius: 12, color: "#fff", fontSize: 13, fontWeight: 700, fontFamily: "inherit", cursor: "pointer" }} onClick={() => { SFX.click(); setDayEnd(false); printDayReport("dayend"); }}>🖨️ طباعة / PDF</button>
              <button className="bp" style={{ padding: "12px", background: `linear-gradient(135deg,${C.green},#00a67e)`, border: "none", borderRadius: 12, color: "#fff", fontSize: 13, fontWeight: 700, fontFamily: "inherit", cursor: "pointer" }} onClick={() => { SFX.success(); setDayEnd(false); printDayReport("share"); }}>📤 مشاركة</button>
            </div>
            <button style={{ width: "100%", padding: "10px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 12, color: C.dim, fontSize: 13, fontFamily: "inherit", cursor: "pointer" }} onClick={() => setDayEnd(false)}>إغلاق</button>
          </div>
        </div>
      )}

      {/* ── HEADER ── */}
      <div style={{ background: "linear-gradient(135deg,#0d1526,#111f38)", padding: "11px 14px 9px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, zIndex: 50, boxShadow: "0 4px 24px rgba(0,0,0,.5)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg,${C.accent},#0072ff)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, boxShadow: `0 0 14px ${C.ag}` }}>🚗</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 900, letterSpacing: 1 }}>{cfg.shopName}</div>
            <div style={{ fontSize: 9, color: drawerOpen ? C.green : C.red, fontWeight: 700 }}>{drawerOpen ? "🟢 الصندوق مفتوح" : "🔴 الصندوق مغلق"}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {[{ l: "طابور", v: waitingCount, c: C.gold }, { l: "يُخدم", v: servingCount, c: C.green }, { l: "فواتير", v: todayOrders.length, c: C.accent }].map(s => (
            <div key={s.l} style={{ textAlign: "center" }}><div style={{ fontSize: 15, fontWeight: 900, color: s.c }}>{s.v}</div><div style={{ fontSize: 9, color: C.dim }}>{s.l}</div></div>
          ))}
        </div>
        <div style={{ textAlign: "left" }}>
          <div style={{ fontSize: 14, fontWeight: 700, direction: "ltr" }}>{time.toLocaleTimeString("en-GB")}</div>
          <div style={{ fontSize: 9, color: C.dim }}>{time.toLocaleDateString("ar-SA")}</div>
        </div>
      </div>

      {/* ── NAV ── */}
      <div style={{ display: "flex", background: "#0d1526", borderBottom: `1px solid ${C.border}`, overflowX: "auto" }}>
        {NAV.map(n => (
          <button key={n.id} onClick={() => { SFX.nav(); setTab(n.id); }} style={{ flex: 1, minWidth: 50, padding: "8px 2px", border: "none", background: "transparent", color: tab === n.id ? C.accent : C.dim, fontSize: 9, fontFamily: "inherit", cursor: "pointer", borderBottom: tab === n.id ? `2px solid ${C.accent}` : "2px solid transparent", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, fontWeight: tab === n.id ? 700 : 400 }}>
            <span style={{ fontSize: 13 }}>{n.icon}</span>{n.label}
          </button>
        ))}
      </div>

      <div style={{ padding: "13px 12px 100px" }}>

        {/* ════ POS ════ */}
        {tab === "pos" && <>
          {/* Step indicator */}
          <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
            {["اختر الخدمات", "الفاتورة", "الدفع", "بيانات العميل"].map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", flex: i < 3 ? 1 : 0 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                  <div style={{ width: 22, height: 22, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, background: i === 0 ? C.ad : C.surface, border: i === 0 ? `1px solid ${C.accent}` : `1px solid ${C.border}`, color: i === 0 ? C.accent : C.dim }}>{i + 1}</div>
                  <div style={{ fontSize: 8, color: i === 0 ? C.accent : C.dim, whiteSpace: "nowrap" }}>{s}</div>
                </div>
                {i < 3 && <div style={{ flex: 1, height: 1, background: C.border, margin: "0 3px", marginBottom: 14 }} />}
              </div>
            ))}
          </div>

          <ST c={C.accent} t="🔧 الخدمات المتاحة" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            {services.filter(s => s.active).map(svc => (
              <div key={svc.id} className="hvr" style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px 10px", cursor: "pointer", textAlign: "center", position: "relative", transition: "all .2s" }} onClick={() => addToCart(svc)}>
                {cart.find(i => i.id === svc.id) && <div style={{ position: "absolute", top: 6, left: 6, width: 20, height: 20, borderRadius: 10, background: C.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900, color: "#000" }}>{cart.find(i => i.id === svc.id).qty}</div>}
                <div style={{ fontSize: 24, marginBottom: 4 }}>{svc.icon}</div>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 3 }}>{svc.name}</div>
                <div style={{ fontSize: 17, fontWeight: 900, color: svc.color || C.accent }}>{svc.price}<span style={{ fontSize: 10, color: C.dim }}> ر.س</span></div>
              </div>
            ))}
          </div>

          {cart.length > 0 && <>
            <ST c={C.gold} t={`🧾 الفاتورة (${cart.length})`} />
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, marginBottom: 14, overflow: "hidden" }}>
              <div style={{ background: C.sl, padding: "10px 14px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>الخدمات المحددة</span>
                <button style={{ padding: "4px 10px", borderRadius: 8, border: `1px solid ${C.red}`, background: "transparent", color: C.red, fontSize: 11, fontFamily: "inherit", cursor: "pointer" }} onClick={clearCart}>🗑️ مسح</button>
              </div>
              {cart.map(item => (
                <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderBottom: `1px solid ${C.border}` }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{item.icon}{item.name}</div>
                    <div style={{ fontSize: 11, color: C.dim }}>{item.price} × {item.qty} = {(item.price * item.qty).toFixed(0)} ر.س</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    {[["−", -1], ["+", 1]].map(([lbl, d]) => (<button key={lbl} style={{ width: 26, height: 26, borderRadius: 8, border: `1px solid ${C.border}`, background: C.sl, color: C.text, cursor: "pointer", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => changeQty(item.id, d)}>{lbl}</button>))}
                    <span style={{ fontWeight: 800, minWidth: 22, textAlign: "center" }}>{item.qty}</span>
                    <button style={{ width: 26, height: 26, borderRadius: 8, border: "1px solid rgba(255,95,109,.3)", background: "rgba(255,95,109,.1)", color: C.red, cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => removeItem(item.id)}>✕</button>
                  </div>
                </div>
              ))}
              <div style={{ background: C.sl, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div><div style={{ fontSize: 12, color: C.dim }}>الإجمالي</div><div style={{ fontSize: 24, fontWeight: 900, color: C.gold }}>{total.toFixed(0)} ر.س</div></div>
                <button className="bp" style={{ padding: "12px 20px", borderRadius: 12, border: "none", background: `linear-gradient(135deg,${C.gold},#e8a800)`, color: "#000", fontSize: 15, fontWeight: 800, fontFamily: "inherit", cursor: "pointer", boxShadow: `0 4px 16px ${C.gg}` }} onClick={() => { if (!cart.length) return; SFX.click(); setStep("pay"); }}>
                  🖨️ إصدار فاتورة
                </button>
              </div>
            </div>
          </>}
          {cart.length === 0 && <div style={{ textAlign: "center", color: C.dim, padding: "28px 0" }}><div style={{ fontSize: 36, marginBottom: 10 }}>🛒</div>اضغط على خدمة لإضافتها</div>}
        </>}

        {/* ════ QUEUE ════ */}
        {tab === "queue" && <>
          <div style={{ display: "flex", gap: 9, marginBottom: 16 }}>
            <button className="bp" style={{ flex: 1, padding: "11px", borderRadius: 12, border: "none", background: `linear-gradient(135deg,${C.accent},#0072ff)`, color: "#fff", fontSize: 13, fontWeight: 700, fontFamily: "inherit", cursor: "pointer", boxShadow: `0 4px 14px ${C.ag}` }} onClick={() => { SFX.queue(); addQueue(); }}>🚗 إضافة سيارة</button>
            <button className="bp" style={{ flex: 1, padding: "11px", borderRadius: 12, border: "none", background: `linear-gradient(135deg,${C.green},#00a67e)`, color: "#fff", fontSize: 13, fontWeight: 700, fontFamily: "inherit", cursor: "pointer", boxShadow: `0 4px 14px ${C.gr}` }} onClick={() => { SFX.success(); autoAssign(); }}>⚡ توزيع تلقائي</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
            {[{ status: "waiting", label: `⏳ انتظار (${waitingCount})`, clr: C.gold }, { status: "serving", label: `✅ يُخدم (${servingCount})`, clr: C.green }].map(({ status, label, clr }) => (
              <div key={status}>
                <div style={{ fontSize: 10, color: C.dim, fontWeight: 700, marginBottom: 8, letterSpacing: 1 }}>{label}</div>
                {queue.filter(c => c.status === status).length === 0 ? <div style={{ color: C.dim, fontSize: 12, textAlign: "center", padding: "16px 0" }}>لا يوجد</div> : queue.filter(c => c.status === status).map(car => {
                  const wrk = workers.find(w => w.id === car.workerId);
                  return (
                    <div key={car.id} style={{ background: C.surface, border: `1px solid ${clr}30`, borderRadius: 12, padding: "12px", marginBottom: 8 }}>
                      <div style={{ fontSize: 22, fontWeight: 900, color: C.accent, marginBottom: 4 }}>{car.num}</div>
                      {wrk && <div style={{ fontSize: 11, color: C.dim, marginBottom: 6 }}>👷 {wrk.name}</div>}
                      {status === "serving" && <button className="bp" style={{ width: "100%", padding: "7px", borderRadius: 9, border: "none", background: `linear-gradient(135deg,${C.green},#00a67e)`, color: "#fff", fontSize: 12, fontWeight: 700, fontFamily: "inherit", cursor: "pointer" }} onClick={() => { SFX.finish(); finishCar(car); }}>✔️ إنهاء</button>}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <ST c={C.green} t="👷 حالة العمال" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
            {workers.map(w => (
              <div key={w.id} style={{ background: w.busy ? "rgba(255,95,109,.05)" : "rgba(34,211,160,.05)", border: `1px solid ${w.busy ? "rgba(255,95,109,.3)" : "rgba(34,211,160,.3)"}`, borderRadius: 12, padding: "12px", textAlign: "center" }}>
                <div style={{ fontSize: 26, marginBottom: 5 }}>👷</div>
                <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 5 }}>{w.name}</div>
                <span style={{ padding: "3px 10px", borderRadius: 16, fontSize: 10, fontWeight: 700, background: w.busy ? "rgba(255,95,109,.15)" : "rgba(34,211,160,.15)", color: w.busy ? C.red : C.green, border: `1px solid ${w.busy ? "rgba(255,95,109,.3)" : "rgba(34,211,160,.3)"}` }}>{w.busy ? "مشغول" : "متاح"}</span>
                <div style={{ fontSize: 10, color: C.dim, marginTop: 5 }}>{w.done || 0} طلب</div>
              </div>
            ))}
          </div>
        </>}

        {/* ════ CASH DRAWER ════ */}
        {tab === "cashier_session" && <>
          <ST c={drawerOpen ? C.green : C.red} t={drawerOpen ? "🟢 الصندوق مفتوح" : "🔴 الصندوق مغلق"} />
          {!drawerOpen ? (
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "18px 16px", marginBottom: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, textAlign: "center" }}>فتح الصندوق</div>
              <Lbl t="رصيد الافتتاح (ر.س)" />
              <input style={{ ...M.inp, marginBottom: 14 }} type="number" min="0" placeholder="أدخل الرصيد" value={openAmt} onChange={e => setOpenAmt(e.target.value)} inputMode="numeric" />
              <button className="bp" style={{ width: "100%", padding: "13px", borderRadius: 12, border: "none", background: `linear-gradient(135deg,${C.green},#00a67e)`, color: "#fff", fontSize: 15, fontWeight: 800, fontFamily: "inherit", cursor: "pointer", boxShadow: `0 4px 14px ${C.gr}` }} onClick={() => { SFX.drawer(); openDrawer(); }}>
                🟢 فتح الصندوق
              </button>
            </div>
          ) : <>
            <div style={{ background: C.surface, border: "1px solid rgba(34,211,160,.3)", borderRadius: 14, padding: "15px", marginBottom: 12 }}>
              {[["الكاشير", activeSession?.cashier], ["وقت الفتح", activeSession?.openTime, C.green], ["رصيد الافتتاح", fmt(activeSession?.openAmount || 0), C.gold], ["الفواتير", sessOrders.length, C.accent], ["المبيعات", fmt(sessSales), C.green], ["الرصيد الكلي", fmt(sessSales + (activeSession?.openAmount || 0)), C.gold]].map(([l, v, c], i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: i < 5 ? `1px solid ${C.border}` : "none", fontSize: i === 5 ? 15 : 13, fontWeight: i === 5 ? 900 : 400 }}>
                  <span style={{ color: C.dim }}>{l}</span><span style={{ color: c || C.text, fontWeight: 700 }}>{v}</span>
                </div>
              ))}
            </div>
            <ST c={C.accent} t="💳 توزيع الدفع" />
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "10px 12px", marginBottom: 12 }}>
              {sessPayBreak.map(p => (<div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.border}`, fontSize: 12 }}><span>{p.icon}{p.label}</span><span style={{ color: C.dim }}>{p.count}</span><span style={{ color: p.color, fontWeight: 700 }}>{fmt(p.total)}</span></div>))}
            </div>
            <button className="bp" style={{ width: "100%", padding: "13px", borderRadius: 12, border: "none", background: `linear-gradient(135deg,${C.red},#c0392b)`, color: "#fff", fontSize: 15, fontWeight: 800, fontFamily: "inherit", cursor: "pointer" }} onClick={() => { SFX.click(); setCloseModal(true); }}>
              🔴 إغلاق الصندوق
            </button>
          </>}
          {sessions.filter(s => s.closeTime).length > 0 && <>
            <ST c={C.dim} t="📁 سجل الجلسات" mb={8} />
            {sessions.filter(s => s.closeTime).slice(0, 5).map(s => (
              <div key={s.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 11, padding: "11px 13px", marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontSize: 12, fontWeight: 700 }}>{s.date}</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: C.gold }}>{fmt(s.sales || 0)}</span>
                </div>
                <div style={{ fontSize: 11, color: C.dim }}>{s.cashier} | فتح: {s.openTime} | إغلاق: {s.closeTime} | {s.ordersCount || 0} فاتورة</div>
              </div>
            ))}
          </>}
        </>}

        {/* ════ ORDERS ════ */}
        {tab === "orders" && <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <ST c={C.accent} t={`📋 الطلبات (${filteredOrders.length})`} mb={0} />
            <div style={{ display: "flex", gap: 7 }}>
              <button style={Btn.outline} onClick={() => { SFX.click(); printDayReport("daily"); }}>🖨️ تقرير اليوم</button>
              <button style={{ ...Btn.outline, color: C.green, borderColor: "rgba(34,211,160,.35)" }} onClick={() => { SFX.click(); setDayEnd(true); }}>📊 نهاية اليوم</button>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            {[["today", "اليوم"], ["week", "الأسبوع"], ["month", "الشهر"], ["all", "الكل"]].map(([v, l]) => (
              <button key={v} style={{ padding: "5px 11px", borderRadius: 16, border: ordFilter === v ? `2px solid ${C.accent}` : `1px solid ${C.border}`, background: ordFilter === v ? C.ad : "transparent", color: ordFilter === v ? C.accent : C.dim, fontSize: 11, fontFamily: "inherit", cursor: "pointer", fontWeight: ordFilter === v ? 800 : 400 }} onClick={() => { SFX.click(); setOrdFilter(v); }}>{l}</button>
            ))}
          </div>
          <input style={{ ...M.inp, marginBottom: 10 }} placeholder="🔍 ابحث برقم الطلب، اللوحة، اسم العميل..." value={ordQ} onChange={e => setOrdQ(e.target.value)} />
          {filteredOrders.length > 0 && (
            <div style={{ display: "flex", gap: 7, marginBottom: 12, overflowX: "auto", paddingBottom: 3 }}>
              {PAY_METHODS.map(pm => { const c = filteredOrders.filter(o => o.payment === pm.id).length; const t = filteredOrders.filter(o => o.payment === pm.id).reduce((s, o) => s + o.total, 0); if (!c) return null; return (<div key={pm.id} style={{ padding: "6px 11px", borderRadius: 9, background: `${pm.color}18`, border: `1px solid ${pm.color}30`, flexShrink: 0 }}><div style={{ fontSize: 11, fontWeight: 700, color: pm.color }}>{pm.icon}{pm.label}</div><div style={{ fontSize: 12, fontWeight: 800 }}>{fmt(t)}</div><div style={{ fontSize: 10, color: C.dim }}>{c} فاتورة</div></div>); })}
              <div style={{ padding: "6px 11px", borderRadius: 9, background: `${C.gold}18`, border: `1px solid ${C.gold}30`, flexShrink: 0 }}><div style={{ fontSize: 11, fontWeight: 700, color: C.gold }}>💰 الإجمالي</div><div style={{ fontSize: 12, fontWeight: 800 }}>{fmt(filteredOrders.reduce((s, o) => s + o.total, 0))}</div><div style={{ fontSize: 10, color: C.dim }}>{filteredOrders.length} فاتورة</div></div>
            </div>
          )}
          {filteredOrders.length === 0 ? <Empty t="لا يوجد طلبات" /> : filteredOrders.map(o => (
            <div key={o.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "11px 13px", marginBottom: 8, cursor: "pointer" }} onClick={() => { SFX.click(); setReceipt(o); }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 10, background: C.ad, border: `1px solid rgba(0,198,255,.25)`, borderRadius: 5, padding: "1px 6px", color: C.accent, fontWeight: 700 }}>{o.id}</span>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>🚗 {o.carPlate}</span>
                </div>
                <span style={{ fontSize: 14, fontWeight: 900, color: C.gold }}>{fmt(o.total)}</span>
              </div>
              {o.customerName && <div style={{ fontSize: 11, color: C.green, marginBottom: 2 }}>👤 {o.customerName}</div>}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.dim }}>
                <span>{o.items.map(i => i.name).join(" · ")}</span>
                <span style={{ color: PAY_METHODS.find(p => p.id === o.payment)?.color || C.mid, fontWeight: 700 }}>{PAY_METHODS.find(p => p.id === o.payment)?.icon}{o.payment}</span>
              </div>
              <div style={{ fontSize: 10, color: C.dim, marginTop: 2 }}>{o.cashier} | {o.date} {o.time}</div>
            </div>
          ))}
        </>}

        {/* ════ DASHBOARD ════ */}
        {tab === "dashboard" && <>
          <ST c={C.accent} t="🏠 نظرة عامة" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginBottom: 14 }}>
            {[{ l: "إيرادات اليوم", v: fmt(todayRev), c: C.accent }, { l: "طلبات اليوم", v: todayOrders.length, c: C.green }, { l: "إجمالي العملاء", v: customers.length, c: C.gold }, { l: "صافي الربح", v: fmt(totalRev - totalExp), c: (totalRev - totalExp) >= 0 ? C.green : C.red }].map((s, i) => (
              <div key={i} style={{ background: `${s.c}18`, border: `1px solid ${s.c}30`, borderRadius: 14, padding: "13px 12px" }}><div style={{ fontSize: 18, fontWeight: 900, color: s.c, marginBottom: 2 }}>{s.v}</div><div style={{ fontSize: 11, color: C.dim }}>{s.l}</div></div>
            ))}
          </div>
          <ST c={C.gold} t="📊 آخر 7 أيام" />
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 13, padding: "13px 11px", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 88 }}>
              {last7.map((d, i) => (<div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                <div style={{ width: "100%", display: "flex", gap: 2, alignItems: "flex-end", height: 72 }}>
                  <div style={{ flex: 1, background: C.accent, borderRadius: "3px 3px 0 0", height: `${(d.rev / maxBar * 100).toFixed(0)}%`, minHeight: d.rev ? 3 : 0 }} />
                  <div style={{ flex: 1, background: C.red, borderRadius: "3px 3px 0 0", height: `${(d.exp / maxBar * 100).toFixed(0)}%`, minHeight: d.exp ? 3 : 0 }} />
                </div>
                <div style={{ fontSize: 9, color: C.dim }}>{d.lbl}</div>
              </div>))}
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 8, justifyContent: "center" }}>
              {[{ c: C.accent, l: "إيرادات" }, { c: C.red, l: "مصروفات" }].map(s => (<div key={s.l} style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 10, height: 10, background: s.c, borderRadius: 2 }} /><span style={{ fontSize: 10, color: C.dim }}>{s.l}</span></div>))}
            </div>
          </div>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 13, padding: "12px 14px", marginBottom: 14 }}>
            {[["إجمالي المبيعات", fmt(totalRev), C.accent], ["إجمالي المصروفات", fmt(totalExp), C.red], ["صافي الربح", fmt(totalRev - totalExp), (totalRev - totalExp) >= 0 ? C.green : C.red], ["إجمالي الطلبات", orders.length, C.mid], ["إجمالي العملاء", customers.length, C.gold]].map(([l, v, c], i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: i < 4 ? `1px solid ${C.border}` : "none" }}>
                <span style={{ fontSize: 13, color: C.dim }}>{l}</span><span style={{ fontSize: 14, fontWeight: 800, color: c }}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 9 }}>
            <button className="bp" style={{ ...Btn.outline, flex: 1 }} onClick={() => { SFX.click(); printDayReport("daily"); }}>🖨️ تقرير اليوم PDF</button>
            <button className="bp" style={{ ...Btn.outline, flex: 1, color: C.green, borderColor: "rgba(34,211,160,.35)" }} onClick={() => { SFX.click(); setDayEnd(true); }}>📊 نهاية اليوم</button>
          </div>
        </>}

        {/* ════ ANALYTICS ════ */}
        {tab === "analytics" && <>
          <ST c={C.accent} t="📈 التحليلات" />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 14 }}>
            {PERIODS.map(p => (<button key={p.id} style={{ padding: "6px 12px", borderRadius: 18, border: period === p.id ? `2px solid ${C.accent}` : `1px solid ${C.border}`, background: period === p.id ? C.ad : "transparent", color: period === p.id ? C.accent : C.dim, fontSize: 11, fontFamily: "inherit", cursor: "pointer", fontWeight: period === p.id ? 800 : 400 }} onClick={() => { SFX.click(); setPeriod(p.id); }}>{p.label}</button>))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginBottom: 14 }}>
            {[{ l: "المبيعات", v: fmt(pRev), c: C.accent }, { l: "الطلبات", v: pOrders.length, c: C.green }, { l: "المصروفات", v: fmt(pExp), c: C.red }, { l: "صافي الربح", v: fmt(pNet), c: pNet >= 0 ? C.green : C.red }].map((s, i) => (
              <div key={i} style={{ background: `${s.c}18`, border: `1px solid ${s.c}30`, borderRadius: 13, padding: "12px" }}><div style={{ fontSize: 17, fontWeight: 900, color: s.c, marginBottom: 2 }}>{s.v}</div><div style={{ fontSize: 11, color: C.dim }}>{s.l}</div></div>
            ))}
          </div>
          <ST c={C.gold} t="🔧 أداء الخدمات" />
          {svcStats.map(s => (
            <div key={s.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "11px 12px", marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{s.icon}{s.name}</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: s.color || C.accent }}>{fmt(s.rev)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: C.dim }}>{s.cnt} مرة</span>
                <span style={{ fontSize: 11, color: C.dim }}>{s.share.toFixed(1)}%</span>
              </div>
              <div style={{ height: 5, borderRadius: 5, background: C.border }}>
                <div style={{ height: 5, borderRadius: 5, background: s.color || C.accent, width: `${s.share}%`, transition: "width .5s" }} />
              </div>
            </div>
          ))}
          <button className="bp" style={{ ...Btn.outline, width: "100%", marginTop: 8 }} onClick={() => { SFX.click(); printPeriodReport(); }}>🖨️ طباعة تقرير {PERIODS.find(p => p.id === period)?.label}</button>
        </>}

        {/* ════ CUSTOMERS ════ */}
        {tab === "customers" && <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <ST c={C.green} t={`👤 العملاء (${customers.length})`} mb={0} />
            <button className="bp" style={Btn.outline} onClick={() => { SFX.click(); setEditCust({ id: "new", name: "", phone: "", email: "", notes: "", vehicles: [], totalOrders: 0, totalSpent: 0, createdAt: todayStr() }); }}>+ إضافة</button>
          </div>
          <input style={{ ...M.inp, marginBottom: 10 }} placeholder="🔍 ابحث بالاسم، الجوال، رقم العميل، اللوحة..." value={custQ} onChange={e => setCustQ(e.target.value)} />
          {filteredCusts.length === 0 ? <Empty t={custQ ? "لا توجد نتائج" : "يُضاف العملاء تلقائياً من الكاشير!"} /> : filteredCusts.map(c => (
            <div key={c.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "11px 12px", marginBottom: 8, cursor: "pointer" }} onClick={() => { SFX.click(); setViewCust(c); }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: `linear-gradient(135deg,${C.accent},#0072ff)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>👤</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 800 }}>{c.name}</span>
                    <span style={{ fontSize: 10, background: C.ad, border: `1px solid rgba(0,198,255,.3)`, borderRadius: 5, padding: "1px 7px", color: C.accent, fontWeight: 700 }}>{c.id}</span>
                  </div>
                  <div style={{ fontSize: 11, color: C.dim }}>{c.phone}</div>
                  <div style={{ display: "flex", gap: 10, marginTop: 3 }}>
                    <span style={{ fontSize: 11, color: C.gold }}>{c.totalOrders || 0} زيارة</span>
                    <span style={{ fontSize: 11, color: C.accent }}>{fmt(c.totalSpent || 0)}</span>
                    {(c.vehicles || []).length > 0 && <span style={{ fontSize: 11, color: C.green }}>🚗 {c.vehicles.map(v => v.plate).join(" · ")}</span>}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <button style={Btn.sm} onClick={e => { e.stopPropagation(); SFX.click(); setEditCust({ ...c }); }}>✏️</button>
                  <button style={Btn.smDanger} onClick={e => { e.stopPropagation(); SFX.delete(); dbDel("customers", c.id); setCustomers(p => p.filter(x => x.id !== c.id)); toast$("🗑️ تم الحذف"); }}>🗑️</button>
                </div>
              </div>
            </div>
          ))}
        </>}

        {/* ════ EXPENSES ════ */}
        {tab === "expenses" && <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <ST c={C.red} t="💸 المصروفات" mb={0} />
            <button className="bp" style={Btn.outline} onClick={() => { SFX.click(); setEditExp({ id: "new", title: "", amount: 0, category: EXPENSE_CATS[0], note: "", date: todayStr(), ts: Date.now() }); }}>+ إضافة</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginBottom: 12 }}>
            <div style={{ background: `${C.red}18`, border: `1px solid ${C.red}30`, borderRadius: 13, padding: "12px" }}><div style={{ fontSize: 17, fontWeight: 900, color: C.red, marginBottom: 2 }}>{fmt(totalExp)}</div><div style={{ fontSize: 11, color: C.dim }}>إجمالي المصروفات</div></div>
            <div style={{ background: `${C.green}18`, border: `1px solid ${C.green}30`, borderRadius: 13, padding: "12px" }}><div style={{ fontSize: 15, fontWeight: 900, color: (totalRev - totalExp) >= 0 ? C.green : C.red, marginBottom: 2 }}>{fmt(totalRev - totalExp)}</div><div style={{ fontSize: 11, color: C.dim }}>صافي الربح</div></div>
          </div>
          {expenses.length === 0 ? <Empty t="لا يوجد مصروفات" /> : expenses.map(exp => (
            <div key={exp.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "11px 13px", marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{exp.title}</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: C.red }}>{fmt(exp.amount)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11, color: C.dim }}>{exp.category} | {exp.date}</span>
                <div style={{ display: "flex", gap: 6 }}>
                  <button style={Btn.sm} onClick={() => { SFX.click(); setEditExp({ ...exp }); }}>✏️</button>
                  <button style={Btn.smDanger} onClick={() => { SFX.delete(); dbDel("expenses", exp.id); setExpenses(p => p.filter(e => e.id !== exp.id)); toast$("🗑️ تم الحذف"); }}>🗑️</button>
                </div>
              </div>
            </div>
          ))}
        </>}

        {/* ════ SERVICES ════ */}
        {tab === "services" && <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <ST c={C.accent} t={`⚙️ الخدمات (${services.length})`} mb={0} />
            <button className="bp" style={Btn.outline} onClick={() => { SFX.click(); setEditSvc({ id: "new", name: "", price: 0, icon: "💧", color: C.accent, active: true, cat: "غسيل" }); }}>+ إضافة</button>
          </div>
          {services.map(svc => (
            <div key={svc.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "11px 12px", marginBottom: 8, display: "flex", alignItems: "center", gap: 10, opacity: svc.active ? 1 : .5 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: `${svc.color || C.accent}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{svc.icon}</div>
              <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 700 }}>{svc.name}</div><div style={{ fontSize: 11, color: C.dim }}>{fmt(svc.price)} — {svc.cat}</div></div>
              <Tog on={svc.active} onChange={async () => { const u = { ...svc, active: !svc.active }; await dbSet("services", u); setServices(p => p.map(s => s.id === svc.id ? u : s)); }} />
              <button style={Btn.sm} onClick={() => { SFX.click(); setEditSvc({ ...svc }); }}>✏️</button>
              <button style={Btn.smDanger} onClick={async () => { SFX.delete(); await dbDel("services", svc.id); setServices(p => p.filter(s => s.id !== svc.id)); toast$("🗑️ تم الحذف"); }}>🗑️</button>
            </div>
          ))}
        </>}

        {/* ════ WORKERS ════ */}
        {tab === "workers" && <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <ST c={C.green} t={`👷 العمال (${workers.length})`} mb={0} />
            <button className="bp" style={Btn.outline} onClick={() => { SFX.click(); setEditWrk({ id: "new", name: "", busy: false, done: 0 }); }}>+ إضافة</button>
          </div>
          {workers.map(w => (
            <div key={w.id} style={{ background: w.busy ? "rgba(255,95,109,.05)" : "rgba(34,211,160,.05)", border: `1px solid ${w.busy ? "rgba(255,95,109,.3)" : "rgba(34,211,160,.3)"}`, borderRadius: 12, padding: "11px 13px", marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: w.busy ? C.red : C.green, boxShadow: `0 0 8px ${w.busy ? C.red : C.green}` }} />
              <div style={{ fontSize: 20 }}>👷</div>
              <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 800 }}>{w.name}</div><div style={{ fontSize: 11, color: C.dim }}>{w.done || 0} طلب منجز</div></div>
              <span style={{ padding: "3px 10px", borderRadius: 16, fontSize: 10, fontWeight: 700, background: w.busy ? "rgba(255,95,109,.15)" : "rgba(34,211,160,.15)", color: w.busy ? C.red : C.green }}>{w.busy ? "مشغول" : "متاح"}</span>
              <button style={Btn.sm} onClick={() => { SFX.click(); setEditWrk({ ...w }); }}>✏️</button>
              <button style={Btn.smDanger} onClick={async () => { SFX.delete(); await dbDel("workers", w.id); setWorkers(p => p.filter(x => x.id !== w.id)); toast$("🗑️ تم الحذف"); }}>🗑️</button>
            </div>
          ))}
        </>}

        {/* ════ USERS ════ */}
        {tab === "users" && <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <ST c={C.accent} t="🔐 المستخدمون" mb={0} />
            <button className="bp" style={Btn.outline} onClick={() => { SFX.click(); setEditUser({ id: "new", name: "", username: "", password: "", role: "cashier", active: true }); }}>+ إضافة</button>
          </div>
          {users.map(u => (
            <div key={u.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "11px 12px", marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: 11, background: `${ROLES[u.role]?.color || C.dim}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{ROLES[u.role]?.icon}</div>
              <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 700 }}>{u.name}</div><div style={{ fontSize: 11, color: C.dim }}>@{u.username} — <span style={{ color: ROLES[u.role]?.color }}>{ROLES[u.role]?.label}</span></div></div>
              <Tog on={u.active} onChange={async () => { const upd = { ...u, active: !u.active }; await dbSet("users", upd); setUsers(p => p.map(x => x.id === u.id ? upd : x)); }} />
              <button style={Btn.sm} onClick={() => { SFX.click(); setEditUser({ ...u }); }}>✏️</button>
              {u.id !== "u1" && <button style={Btn.smDanger} onClick={async () => { SFX.delete(); await dbDel("users", u.id); setUsers(p => p.filter(x => x.id !== u.id)); toast$("🗑️ تم الحذف"); }}>🗑️</button>}
            </div>
          ))}
        </>}

        {/* ════ SETTINGS ════ */}
        {tab === "settings" && <>
          <ST c={C.accent} t="⚙️ إعدادات المحل" />
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px", marginBottom: 14 }}>
            {[["اسم المحل", cfg.shopName, C.text], ["رقم الهاتف", cfg.phone, C.dim], ["العنوان", cfg.address, C.dim], ["ضريبة VAT", `${cfg.tax}%`, C.accent]].map(([l, v, c]) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 13, color: C.dim }}>{l}</span><span style={{ fontSize: 13, fontWeight: 700, color: c }}>{v}</span>
              </div>
            ))}
            <button className="bp" style={{ width: "100%", marginTop: 12, padding: "11px", background: `linear-gradient(135deg,${C.accent},#0072ff)`, border: "none", borderRadius: 12, color: "#fff", fontSize: 14, fontWeight: 700, fontFamily: "inherit", cursor: "pointer" }} onClick={() => { SFX.click(); setEditCfg(true); }}>✏️ تعديل الإعدادات</button>
          </div>

          <ST c={C.gold} t="🖨️ الطابعة" />
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px", marginBottom: 14 }}>
            <div style={{ fontSize: 13, color: C.dim, marginBottom: 10 }}>اختبر الطباعة والمشاركة:</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
              <button className="bp" style={{ ...Btn.outline, padding: "12px 8px", textAlign: "center" }} onClick={() => { SFX.click(); if (receipt) printReceipt(receipt); else if (orders.length) { printReceipt(orders[0]); } else toast$("⚠️ لا يوجد فواتير بعد", "warn"); }}>🧾 طباعة فاتورة</button>
              <button className="bp" style={{ ...Btn.outline, padding: "12px 8px", textAlign: "center", color: C.green, borderColor: "rgba(34,211,160,.35)" }} onClick={() => { SFX.click(); printDayReport("daily"); }}>📊 تقرير اليوم</button>
            </div>
          </div>

          <ST c={C.red} t="🚪 الحساب" />
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <div style={{ width: 46, height: 46, borderRadius: 13, background: `${ROLES[session.role]?.color || C.dim}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{ROLES[session.role]?.icon}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800 }}>{session.name}</div>
                <div style={{ fontSize: 12, color: ROLES[session.role]?.color }}>{ROLES[session.role]?.label}</div>
              </div>
            </div>
            <button className="bp" style={{ width: "100%", padding: "12px", background: "rgba(255,95,109,.1)", border: "1px solid rgba(255,95,109,.3)", borderRadius: 12, color: C.red, fontSize: 14, fontWeight: 700, fontFamily: "inherit", cursor: "pointer" }} onClick={() => { SFX.click(); if (confirm("تسجيل الخروج؟")) { SFX.warn(); setSession(null); } }}>
              🚪 تسجيل الخروج
            </button>
          </div>
        </>}

      </div> {/* body */}

      {/* ── RECEIPT MODAL ── */}
      {receipt && (
        <div style={M.overlay} onClick={() => setReceipt(null)}>
          <div style={{ ...M.box, maxWidth: 340 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.accent, marginBottom: 12, textAlign: "center" }}>🧾 فاتورة #{receipt.id}</div>
            {receipt.customerName && <div style={{ textAlign: "center", fontSize: 12, color: C.gold, marginBottom: 10 }}>👤 {receipt.customerName}</div>}
            {[["التاريخ", `${receipt.date} ${receipt.time}`], ["اللوحة", `${receipt.carPlate} (${receipt.carType || ""})`], ["الدفع", `${PAY_METHODS.find(p => p.id === receipt.payment)?.icon || ""}${receipt.payment}`], ["الكاشير", receipt.cashier]].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "4px 0", borderBottom: `1px dashed ${C.border}` }}><span style={{ color: C.dim }}>{k}</span><span style={{ fontWeight: 600 }}>{v}</span></div>
            ))}
            <div style={{ margin: "9px 0 5px", fontSize: 11, color: C.dim }}>الخدمات:</div>
            {receipt.items.map(i => (<div key={i.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "4px 0", borderBottom: `1px dashed ${C.border}` }}><span>{i.icon}{i.name} × {i.qty}</span><span style={{ color: C.accent, fontWeight: 700 }}>{fmt(i.price * i.qty)}</span></div>))}
            <div style={{ marginTop: 10, paddingTop: 8, borderTop: `1px solid ${C.border}` }}>
              {(receipt.discount || 0) > 0 && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "2px 0" }}><span style={{ color: C.green }}>خصم</span><span style={{ color: C.green }}>- {receipt.discount.toFixed(0)} ر.س</span></div>}
              {(receipt.tax || 0) > 0 && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "2px 0" }}><span style={{ color: C.red }}>ضريبة {cfg.tax}%</span><span style={{ color: C.red }}>+ {receipt.tax.toFixed(0)} ر.س</span></div>}
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 17, fontWeight: 900, color: C.gold }}><span>الإجمالي</span><span>{fmt(receipt.total)}</span></div>
            </div>
            <div style={{ display: "flex", gap: 9, marginTop: 12 }}>
              <button className="bp" style={{ flex: 2, padding: "11px", background: `linear-gradient(135deg,${C.accent},#0072ff)`, border: "none", borderRadius: 11, color: "#fff", fontSize: 14, fontWeight: 700, fontFamily: "inherit", cursor: "pointer", boxShadow: `0 4px 14px ${C.ag}` }} onClick={() => { SFX.click(); printReceipt(receipt); }}>🖨️ طباعة / PDF</button>
              <button style={{ flex: 1, padding: "11px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 11, color: C.dim, fontSize: 13, fontFamily: "inherit", cursor: "pointer" }} onClick={() => { SFX.click(); setReceipt(null); }}>إغلاق</button>
            </div>
          </div>
        </div>
      )}

      {/* ── VIEW CUSTOMER MODAL ── */}
      {viewCust && (
        <div style={M.overlay} onClick={() => setViewCust(null)}>
          <div style={{ ...M.box, maxWidth: 370, maxHeight: "88vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.accent, marginBottom: 12, textAlign: "center" }}>👤 ملف العميل</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, padding: "12px", background: C.ad, border: `1px solid rgba(0,198,255,.15)`, borderRadius: 12 }}>
              <div style={{ width: 46, height: 46, borderRadius: 13, background: `linear-gradient(135deg,${C.accent},#0072ff)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>👤</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 800 }}>{viewCust.name}</div>
                <div style={{ fontSize: 12, color: C.dim }}>{viewCust.phone}</div>
                <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                  <span style={{ fontSize: 10, background: C.ad, border: `1px solid rgba(0,198,255,.3)`, borderRadius: 5, padding: "1px 8px", color: C.accent, fontWeight: 800 }}>{viewCust.id}</span>
                  <span style={{ fontSize: 10, color: C.dim }}>منذ {viewCust.createdAt}</span>
                </div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginBottom: 12 }}>
              <div style={{ background: `${C.accent}12`, border: `1px solid ${C.accent}20`, borderRadius: 11, padding: "10px" }}><div style={{ fontSize: 17, fontWeight: 900, color: C.accent }}>{viewCust.totalOrders || 0}</div><div style={{ fontSize: 11, color: C.dim }}>الزيارات</div></div>
              <div style={{ background: `${C.gold}12`, border: `1px solid ${C.gold}20`, borderRadius: 11, padding: "10px" }}><div style={{ fontSize: 14, fontWeight: 900, color: C.gold }}>{fmt(viewCust.totalSpent || 0)}</div><div style={{ fontSize: 11, color: C.dim }}>الإنفاق</div></div>
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.dim, marginBottom: 7 }}>🚗 السيارات</div>
            {(viewCust.vehicles || []).map((v, i) => (<div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", background: C.sl, borderRadius: 9, marginBottom: 5 }}><span style={{ fontSize: 18 }}>🚗</span><div><div style={{ fontSize: 12, fontWeight: 700 }}>{v.plate}</div><div style={{ fontSize: 11, color: C.dim }}>{v.type}</div></div></div>))}
            <div style={{ fontSize: 12, fontWeight: 700, color: C.dim, marginBottom: 7, marginTop: 10 }}>سجل الطلبات</div>
            {orders.filter(o => o.customerId === viewCust.id).slice(0, 5).map(o => (
              <div key={o.id} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${C.border}`, fontSize: 12 }}>
                <span style={{ color: C.dim }}>{o.id} | {o.carPlate}</span>
                <span style={{ color: C.accent, fontWeight: 700 }}>{fmt(o.total)}</span>
                <span style={{ color: C.dim }}>{o.date}</span>
              </div>
            ))}
            <div style={{ display: "flex", gap: 9, marginTop: 12 }}>
              <button style={{ flex: 1, padding: "10px", background: `linear-gradient(135deg,${C.accent},#0072ff)`, border: "none", borderRadius: 11, color: "#fff", fontSize: 13, fontWeight: 700, fontFamily: "inherit", cursor: "pointer" }} onClick={() => { SFX.click(); setEditCust({ ...viewCust }); setViewCust(null); }}>✏️ تعديل</button>
              <button style={{ flex: 1, padding: "10px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 11, color: C.dim, fontSize: 13, fontFamily: "inherit", cursor: "pointer" }} onClick={() => { SFX.click(); setViewCust(null); }}>إغلاق</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODALS ── */}
      {editCust && <CustomerMdl cust={editCust} SFX={SFX} onSave={async c => { const isNew = c.id === "new"; const id = isNew ? nextSeq(customers, "CUS") : c.id; const item = { ...c, id, ts: c.ts || Date.now() }; await dbSet("customers", item); setCustomers(p => isNew ? [item, ...p] : p.map(x => x.id === id ? item : x)); setEditCust(null); SFX.success(); toast$("✅ تم الحفظ"); }} onClose={() => { SFX.click(); setEditCust(null); }} />}
      {editSvc && <ServiceMdl svc={editSvc} SFX={SFX} onSave={async s => { const isNew = s.id === "new"; const item = { ...s, id: isNew ? uid("SVC") : s.id }; await dbSet("services", item); setServices(p => isNew ? [...p, item] : p.map(x => x.id === item.id ? item : x)); setEditSvc(null); SFX.success(); toast$("✅ تم الحفظ"); }} onClose={() => { SFX.click(); setEditSvc(null); }} />}
      {editUser && <UserMdl user={editUser} SFX={SFX} onSave={async u => { const isNew = u.id === "new"; const item = { ...u, id: isNew ? uid("USR") : u.id }; await dbSet("users", item); setUsers(p => isNew ? [...p, item] : p.map(x => x.id === item.id ? item : x)); setEditUser(null); SFX.success(); toast$("✅ تم الحفظ"); }} onClose={() => { SFX.click(); setEditUser(null); }} />}
      {editWrk && <WorkerMdl wrk={editWrk} SFX={SFX} onSave={async w => { const isNew = w.id === "new"; const item = { ...w, id: isNew ? uid("WRK") : w.id }; await dbSet("workers", item); setWorkers(p => isNew ? [...p, item] : p.map(x => x.id === item.id ? item : x)); setEditWrk(null); SFX.success(); toast$("✅ تم الحفظ"); }} onClose={() => { SFX.click(); setEditWrk(null); }} />}
      {editExp && <ExpMdl exp={editExp} SFX={SFX} onSave={async e => { const isNew = e.id === "new"; const item = { ...e, id: isNew ? uid("EXP") : e.id, ts: e.ts || Date.now() }; await dbSet("expenses", item); setExpenses(p => isNew ? [item, ...p] : p.map(x => x.id === item.id ? item : x)); setEditExp(null); SFX.success(); toast$("✅ تم الحفظ"); }} onClose={() => { SFX.click(); setEditExp(null); }} />}
      {editCfg && <CfgMdl cfg={cfg} SFX={SFX} onSave={async c => { await dbSet("settings", c); setCfg(c); setEditCfg(false); SFX.success(); toast$("✅ تم الحفظ"); }} onClose={() => { SFX.click(); setEditCfg(false); }} />}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// 🔐 LOGIN
// ══════════════════════════════════════════════════════════
function LoginScreen({ users, onLogin, SFX }) {
  const [un, setUn] = useState(""), [pw, setPw] = useState(""), [err, setErr] = useState("");
  const tryLogin = () => {
    const u = users.find(x => x.username === un && x.password === pw && x.active);
    if (u) { SFX.success(); onLogin(u); } else { SFX.warn(); setErr("بيانات الدخول غير صحيحة"); }
  };
  return (
    <div style={{ fontFamily: "'Cairo',sans-serif", direction: "rtl", background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;800;900&display=swap');*{box-sizing:border-box;margin:0;padding:0}input::placeholder{color:#3d5169}`}</style>
      <div style={{ width: "100%", maxWidth: 360 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ width: 70, height: 70, borderRadius: 20, background: `linear-gradient(135deg,${C.accent},#0072ff)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34, margin: "0 auto 12px", boxShadow: `0 0 30px ${C.ag}` }}>🚗</div>
          <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: 2 }}>TOP CLEAN</div>
          <div style={{ fontSize: 11, color: C.accent, letterSpacing: 3, marginTop: 4 }}>نظام إدارة المغسلة</div>
        </div>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.accent, textAlign: "center", marginBottom: 18 }}>تسجيل الدخول</div>
          {[["اسم المستخدم", un, setUn, "text", "username"], ["كلمة المرور", pw, setPw, "password", "••••"]].map(([l, v, s, t, ph]) => (
            <div key={l} style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: C.dim, display: "block", marginBottom: 4 }}>{l}</label>
              <input type={t} style={{ width: "100%", background: C.sl, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", color: C.text, fontSize: 14, fontFamily: "inherit", outline: "none" }} placeholder={ph} value={v} onChange={e => { s(e.target.value); setErr(""); }} onKeyDown={e => e.key === "Enter" && tryLogin()} />
            </div>
          ))}
          {err && <div style={{ fontSize: 12, color: C.red, textAlign: "center", marginBottom: 10 }}>{err}</div>}
          <button style={{ width: "100%", padding: "13px", background: `linear-gradient(135deg,${C.accent},#0072ff)`, border: "none", borderRadius: 13, color: "#fff", fontSize: 15, fontWeight: 800, fontFamily: "inherit", cursor: "pointer", marginBottom: 16, boxShadow: `0 4px 16px ${C.ag}` }} onClick={tryLogin}>دخول</button>
          <div style={{ background: C.ad, border: `1px solid rgba(0,198,255,.15)`, borderRadius: 10, padding: 12, fontSize: 11, color: C.dim, lineHeight: 2 }}>
            <div style={{ fontWeight: 700, color: C.accent, marginBottom: 3 }}>حسابات تجريبية:</div>
            <div>👑 admin / 1234</div><div>🔵 khalid / 0000</div><div>🟢 ahmed / 0000</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// 📋 MODALS
// ══════════════════════════════════════════════════════════
function CustomerMdl({ cust, onSave, onClose, SFX }) {
  const [f, setF] = useState({ ...cust, vehicles: cust.vehicles || [] });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const [np, setNp] = useState(""), [nt, setNt] = useState("سيدان");
  return (
    <GM title={cust.id === "new" ? "➕ عميل جديد" : "✏️ تعديل العميل"} onSave={() => { if (!f.name.trim()) return; onSave(f); }} onClose={onClose}>
      <FL l="الاسم *"><input style={M.inp} value={f.name} onChange={e => set("name", e.target.value)} placeholder="اسم العميل" /></FL>
      <FL l="رقم الجوال"><input style={M.inp} value={f.phone || ""} onChange={e => set("phone", e.target.value)} placeholder="05xxxxxxxx" /></FL>
      <FL l="ملاحظات"><input style={M.inp} value={f.notes || ""} onChange={e => set("notes", e.target.value)} placeholder="اختياري" /></FL>
      <FL l="🚗 السيارات">
        {f.vehicles.map((v, i) => (<div key={i} style={{ display: "flex", alignItems: "center", gap: 7, padding: "5px 8px", background: C.sl, borderRadius: 8, marginBottom: 5 }}><span style={{ flex: 1, fontSize: 12 }}>🚗 {v.plate} ({v.type})</span><button style={Btn.smDanger} onClick={() => setF(p => ({ ...p, vehicles: p.vehicles.filter((_, j) => j !== i) }))}>✕</button></div>))}
        <div style={{ display: "flex", gap: 6 }}>
          <input style={{ ...M.inp, flex: 2, padding: "7px 10px", fontSize: 12 }} placeholder="رقم اللوحة" value={np} onChange={e => setNp(e.target.value.toUpperCase())} />
          <select style={{ ...M.sel, flex: 1, padding: "7px 8px", fontSize: 11 }} value={nt} onChange={e => setNt(e.target.value)}>{CAR_TYPES.map(t => <option key={t}>{t}</option>)}</select>
          <button style={Btn.outline} onClick={() => { if (!np.trim()) return; setF(p => ({ ...p, vehicles: [...p.vehicles, { plate: np.toUpperCase(), type: nt }] })); setNp(""); }}>+</button>
        </div>
      </FL>
    </GM>
  );
}

function ServiceMdl({ svc, onSave, onClose, SFX }) {
  const [f, setF] = useState({ ...svc });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  return (
    <GM title={svc.id === "new" ? "➕ خدمة جديدة" : "✏️ تعديل الخدمة"} onSave={() => { if (!f.name.trim()) return; onSave(f); }} onClose={onClose}>
      <FL l="الاسم"><input style={M.inp} value={f.name} onChange={e => set("name", e.target.value)} /></FL>
      <FL l="السعر (ر.س)"><input style={M.inp} type="number" value={f.price} onChange={e => set("price", Number(e.target.value))} /></FL>
      <FL l="الفئة"><input style={M.inp} value={f.cat || ""} onChange={e => set("cat", e.target.value)} placeholder="غسيل / تلميع..." /></FL>
      <FL l="الأيقونة"><div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{SVC_ICONS.map(ic => <span key={ic} onClick={() => set("icon", ic)} style={{ fontSize: 20, cursor: "pointer", padding: "4px 6px", borderRadius: 8, background: f.icon === ic ? C.ad : "transparent", border: f.icon === ic ? `1px solid ${C.accent}` : "1px solid transparent" }}>{ic}</span>)}</div></FL>
      <FL l="اللون"><div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{SVC_COLORS.map(cc => <div key={cc} onClick={() => set("color", cc)} style={{ width: 26, height: 26, borderRadius: 7, background: cc, cursor: "pointer", border: f.color === cc ? "3px solid #fff" : "3px solid transparent" }} />)}</div></FL>
    </GM>
  );
}

function UserMdl({ user, onSave, onClose, SFX }) {
  const [f, setF] = useState({ ...user });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  return (
    <GM title={user.id === "new" ? "➕ مستخدم جديد" : "✏️ تعديل المستخدم"} onSave={() => { if (!f.name.trim()) return; onSave(f); }} onClose={onClose}>
      <FL l="الاسم"><input style={M.inp} value={f.name} onChange={e => set("name", e.target.value)} /></FL>
      <FL l="اسم المستخدم"><input style={M.inp} value={f.username} onChange={e => set("username", e.target.value)} /></FL>
      <FL l="كلمة المرور"><input type="password" style={M.inp} value={f.password} onChange={e => set("password", e.target.value)} /></FL>
      <FL l="الدور">
        <select style={M.sel} value={f.role} onChange={e => set("role", e.target.value)}>
          {Object.entries(ROLES).map(([k, r]) => <option key={k} value={k}>{r.icon} {r.label}</option>)}
        </select>
      </FL>
      <div style={{ background: `${ROLES[f.role]?.color || C.dim}10`, border: `1px solid ${ROLES[f.role]?.color || C.dim}20`, borderRadius: 10, padding: "10px 12px" }}>
        <div style={{ fontSize: 11, color: C.dim, marginBottom: 5 }}>الصلاحيات:</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {ROLES[f.role]?.perms.map(p => <span key={p} style={{ fontSize: 10, background: `${ROLES[f.role].color}15`, border: `1px solid ${ROLES[f.role].color}28`, borderRadius: 6, padding: "2px 8px", color: ROLES[f.role].color }}>{p}</span>)}
        </div>
      </div>
    </GM>
  );
}

function WorkerMdl({ wrk, onSave, onClose, SFX }) {
  const [f, setF] = useState({ ...wrk });
  return (
    <GM title={wrk.id === "new" ? "➕ عامل جديد" : "✏️ تعديل العامل"} onSave={() => { if (!f.name.trim()) return; onSave(f); }} onClose={onClose}>
      <FL l="اسم العامل"><input style={M.inp} value={f.name} onChange={e => setF(p => ({ ...p, name: e.target.value }))} placeholder="اسم العامل" /></FL>
    </GM>
  );
}

function ExpMdl({ exp, onSave, onClose, SFX }) {
  const [f, setF] = useState({ ...exp });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  return (
    <GM title={exp.id === "new" ? "➕ مصروف جديد" : "✏️ تعديل المصروف"} onSave={() => { if (!f.title.trim() || !f.amount) return; onSave(f); }} onClose={onClose}>
      <FL l="العنوان"><input style={M.inp} value={f.title} onChange={e => set("title", e.target.value)} placeholder="مثال: شراء مواد تنظيف" /></FL>
      <FL l="المبلغ (ر.س)"><input style={M.inp} type="number" value={f.amount} onChange={e => set("amount", Number(e.target.value))} /></FL>
      <FL l="الفئة"><select style={M.sel} value={f.category} onChange={e => set("category", e.target.value)}>{EXPENSE_CATS.map(c => <option key={c}>{c}</option>)}</select></FL>
      <FL l="ملاحظة"><input style={M.inp} value={f.note || ""} onChange={e => set("note", e.target.value)} placeholder="اختياري" /></FL>
    </GM>
  );
}

function CfgMdl({ cfg, onSave, onClose, SFX }) {
  const [f, setF] = useState({ ...cfg });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  return (
    <GM title="⚙️ إعدادات المحل" onSave={() => onSave(f)} onClose={onClose}>
      <FL l="اسم المحل"><input style={M.inp} value={f.shopName} onChange={e => set("shopName", e.target.value)} /></FL>
      <FL l="رقم الهاتف"><input style={M.inp} value={f.phone || ""} onChange={e => set("phone", e.target.value)} /></FL>
      <FL l="العنوان"><input style={M.inp} value={f.address || ""} onChange={e => set("address", e.target.value)} /></FL>
      <FL l="نسبة VAT (%)"><input style={M.inp} type="number" min="0" max="30" value={f.tax} onChange={e => set("tax", Number(e.target.value))} /></FL>
    </GM>
  );
}

function GM({ title, onSave, onClose, children }) {
  return (
    <div style={M.overlay}>
      <div style={M.box}>
        <div style={{ fontSize: 15, fontWeight: 800, color: C.accent, marginBottom: 14, textAlign: "center" }}>{title}</div>
        {children}
        <div style={{ display: "flex", gap: 9, marginTop: 14 }}>
          <button className="bp" style={{ flex: 2, padding: "11px", background: `linear-gradient(135deg,${C.accent},#0072ff)`, border: "none", borderRadius: 11, color: "#fff", fontSize: 14, fontWeight: 700, fontFamily: "inherit", cursor: "pointer", boxShadow: `0 4px 14px ${C.ag}` }} onClick={onSave}>حفظ</button>
          <button style={{ flex: 1, padding: "11px", background: "rgba(255,95,109,.1)", border: "1px solid rgba(255,95,109,.3)", borderRadius: 11, color: C.red, fontSize: 13, fontFamily: "inherit", cursor: "pointer" }} onClick={onClose}>إلغاء</button>
        </div>
      </div>
    </div>
  );
}

// ── Micro helpers ──────────────────────────────────────────
function Tog({ on, onChange }) {
  return <div onClick={onChange} style={{ width: 38, height: 22, borderRadius: 11, background: on ? C.accent : "#1e2d45", cursor: "pointer", position: "relative", transition: "background .2s", flexShrink: 0 }}><div style={{ width: 16, height: 16, borderRadius: 8, background: "#fff", position: "absolute", top: 3, left: on ? 19 : 3, transition: "left .2s" }} /></div>;
}
function ST({ c, t, mb = 10 }) {
  return <div style={{ fontSize: 10, color: C.dim, fontWeight: 700, letterSpacing: 3, marginBottom: mb, textTransform: "uppercase", display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 6, height: 6, borderRadius: "50%", background: c }} />{t}</div>;
}
function FL({ l, children }) {
  return <div style={{ marginBottom: 12 }}><label style={{ fontSize: 11, color: C.dim, display: "block", marginBottom: 4 }}>{l}</label>{children}</div>;
}
function Lbl({ t }) { return <label style={{ fontSize: 11, color: C.dim, display: "block", marginBottom: 4 }}>{t}</label>; }
function Empty({ t }) { return <div style={{ textAlign: "center", color: C.dim, padding: "30px 0" }}><div style={{ fontSize: 30, marginBottom: 8 }}>📭</div>{t}</div>; }

const M = {
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,.82)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 14 },
  box:     { background: C.surface, borderRadius: 20, padding: 20, width: "100%", maxWidth: 400, border: `1px solid ${C.border}`, maxHeight: "90vh", overflowY: "auto" },
  inp:     { width: "100%", background: C.sl, border: `1px solid ${C.border}`, borderRadius: 10, padding: "9px 11px", color: C.text, fontSize: 13, fontFamily: "inherit", outline: "none" },
  sel:     { width: "100%", background: C.sl, border: `1px solid ${C.border}`, borderRadius: 10, padding: "9px 11px", color: C.text, fontSize: 13, fontFamily: "inherit", outline: "none", cursor: "pointer" },
  primaryBtn: { width: "100%", padding: "13px", background: `linear-gradient(135deg,${C.accent},#0072ff)`, border: "none", borderRadius: 13, color: "#fff", fontSize: 15, fontWeight: 800, fontFamily: "inherit", cursor: "pointer", boxShadow: `0 4px 16px rgba(0,198,255,.25)` },
  secBtn:  { padding: "13px 18px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 13, color: C.dim, fontSize: 13, fontFamily: "inherit", cursor: "pointer" },
};

const Btn = {
  outline:   { padding: "7px 13px", background: "transparent", border: `1px solid rgba(0,198,255,.35)`, borderRadius: 9, color: C.accent, fontSize: 12, fontFamily: "inherit", cursor: "pointer", fontWeight: 600 },
  sm:        { padding: "4px 9px", background: "transparent", border: `1px solid rgba(0,198,255,.3)`, borderRadius: 8, color: C.accent, fontSize: 11, fontFamily: "inherit", cursor: "pointer" },
  smDanger:  { padding: "4px 9px", background: "rgba(255,95,109,.1)", border: "1px solid rgba(255,95,109,.3)", borderRadius: 8, color: C.red, fontSize: 11, fontFamily: "inherit", cursor: "pointer" },
};
