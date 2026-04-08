import { useState, useEffect, useRef } from "react";
import "./LibraryIoTDashboard.css";
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

// ── helpers ──────────────────────────────────────────────────────────────────
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const drift = (v, lo, hi, step = 3) => clamp(v + rand(-step, step), lo, hi);

const initSensor = () => ({
  noise: rand(38, 72),
  light: rand(180, 900),
  count: rand(14, 60),
  is_librarian: Math.random() > 0.3,
  temperature: rand(21, 30),
  humidity: rand(38, 78),
  airQuality: rand(30, 180),
  traffic_level: rand(10, 100),
  speed: rand(50, 500),
  latency: rand(4, 80),
});

const buildHistory = (lo, hi, len = 12) =>
  Array.from({ length: len }, (_, i) => ({ t: `${i - len + 1}m`, v: rand(lo, hi) }));

// ── SVG Icon ──────────────────────────────────────────────────────────────────
const Ico = ({ d, size = 18, sw = 1.8, fill = "none" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}
    stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
const PATHS = {
  noise:  "M9 18V5l12-2v13M9 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm12 0c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2z",
  light:  "M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M18.36 5.64l1.41-1.41M12 7a5 5 0 1 0 0 10A5 5 0 0 0 12 7z",
  people: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm14 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  temp:   "M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z",
  drop:   "M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z",
  wind:   "M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2",
  wifi:   "M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01",
  signal: "M2 20h.01M7 20v-4M12 20V10M17 20V4M22 20V2",
  entry:  "M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3",
  exit:   "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
  user:   "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  grid:   "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z",
  activity:"M22 12h-4l-3 9L9 3l-3 9H2",
  clock:  "M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm0 5v5l3 3",
  alert:  "M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01",
  book:   "M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z",
  eye:    "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
  chevL:  "M15 18l-6-6 6-6",
  chevR:  "M9 18l6-6-6-6",
};

// ── Radial Gauge ──────────────────────────────────────────────────────────────
const RadialGauge = ({ value, max, color, unit }) => {
  const pct = clamp(value / max, 0, 1);
  const r = 38, cx = 50, cy = 50;
  const toRad = d => (d * Math.PI) / 180;
  const startAngle = -210, sweep = 240;
  const arc = a => ({ x: cx + r * Math.cos(toRad(a)), y: cy + r * Math.sin(toRad(a)) });
  const endAngle = startAngle + sweep * pct;
  const s = arc(startAngle), e = arc(endAngle), bg = arc(startAngle + sweep);
  return (
    <svg width="100" height="82" viewBox="0 0 100 82">
      <path d={`M${s.x},${s.y} A${r},${r} 0 ${sweep > 180 ? 1 : 0},1 ${bg.x},${bg.y}`}
        fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="7" strokeLinecap="round" />
      {pct > 0 && (
        <path d={`M${s.x},${s.y} A${r},${r} 0 ${sweep * pct > 180 ? 1 : 0},1 ${e.x},${e.y}`}
          fill="none" stroke={color} strokeWidth="7" strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 6px ${color}88)` }} />
      )}
      <text x="50" y="52" textAnchor="middle" fontSize="17" fontWeight="800"
        fill="white" fontFamily="'DM Mono',monospace">{value}</text>
      <text x="50" y="64" textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.35)"
        fontFamily="'DM Sans',sans-serif">{unit}</text>
    </svg>
  );
};

// ── Signal bars ───────────────────────────────────────────────────────────────
const SignalBars = ({ dbm }) => {
  const pct = clamp((dbm + 90) / 50, 0, 1);
  const bars = 5, active = Math.round(pct * bars);
  const color = pct > 0.6 ? "#34d399" : pct > 0.35 ? "#fbbf24" : "#f87171";
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 22 }}>
      {Array.from({ length: bars }, (_, i) => (
        <div key={i} style={{ width: 5, height: 5 + i * 4, borderRadius: 2,
          background: i < active ? color : "rgba(255,255,255,0.1)",
          transition: "background 0.4s", boxShadow: i < active ? `0 0 5px ${color}66` : "none" }} />
      ))}
    </div>
  );
};

// ── Tooltip ───────────────────────────────────────────────────────────────────
const MiniTip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#0d1225", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6,
      padding: "3px 9px", fontSize: 11, color: "white", fontFamily: "'DM Mono',monospace" }}>
      {payload[0].value}
    </div>
  );
};

// ── Badge ─────────────────────────────────────────────────────────────────────
const Badge = ({ label, color }) => {
  const map = {
    green:  { bg: "rgba(52,211,153,0.12)",  border: "rgba(52,211,153,0.3)",  text: "#34d399" },
    yellow: { bg: "rgba(251,191,36,0.12)",  border: "rgba(251,191,36,0.3)",  text: "#fbbf24" },
    red:    { bg: "rgba(248,113,113,0.12)", border: "rgba(248,113,113,0.3)", text: "#f87171" },
    blue:   { bg: "rgba(96,165,250,0.12)",  border: "rgba(96,165,250,0.3)",  text: "#60a5fa" },
    purple: { bg: "rgba(167,139,250,0.12)", border: "rgba(167,139,250,0.3)", text: "#a78bfa" },
  };
  const s = map[color] || map.green;
  return (
    <span style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 999,
      padding: "3px 10px", display: "inline-flex", alignItems: "center", gap: 5,
      fontSize: 10, color: s.text, fontFamily: "'DM Sans',sans-serif", fontWeight: 700,
      letterSpacing: "0.03em", whiteSpace: "nowrap" }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: s.text,
        boxShadow: `0 0 5px ${s.text}`, display: "inline-block" }} />
      {label}
    </span>
  );
};

// ── Progress bar ──────────────────────────────────────────────────────────────
const Bar2 = ({ value, max, color, h = 6 }) => (
  <div style={{ background: "rgba(255,255,255,0.07)", borderRadius: 999, height: h, overflow: "hidden" }}>
    <div style={{ width: `${clamp((value / max) * 100, 0, 100)}%`, height: "100%",
      borderRadius: 999, background: color, transition: "width 0.6s ease",
      boxShadow: `0 0 8px ${color}44` }} />
  </div>
);

// ── Card ──────────────────────────────────────────────────────────────────────
const Card = ({ children, style = {} }) => (
  <div style={{
    background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 18, padding: "18px 20px", backdropFilter: "blur(16px)", ...style,
  }}>{children}</div>
);

const SectionHead = ({ title, icon }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
    <span style={{ color: "#818cf8" }}><Ico d={PATHS[icon]} size={16} /></span>
    <span style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: 800, fontSize: 11,
      letterSpacing: "0.08em", color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>
      {title}
    </span>
  </div>
);

const CardLabel = ({ text }) => (
  <div style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 13,
    color: "rgba(255,255,255,0.75)", marginBottom: 14, letterSpacing: "0.01em" }}>{text}</div>
);

// ── Zone row ──────────────────────────────────────────────────────────────────
const ZoneRow = ({ name, value }) => {
  const busy = value > 65, mod = value > 35;
  const color = busy ? "#f87171" : mod ? "#fbbf24" : "#34d399";
  const label = busy ? "Busy" : mod ? "Moderate" : "Calm";
  const variant = busy ? "red" : mod ? "yellow" : "green";
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", fontWeight: 600,
          fontFamily: "'DM Sans',sans-serif" }}>{name}</span>
        <Badge label={label} color={variant} />
      </div>
      <Bar2 value={value} max={100} color={color} h={5} />
    </div>
  );
};

// ── Study Comfort Tab ─────────────────────────────────────────────────────────
function StudyComfortTab({ s, h }) {
  const [scHistory, setScHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/history?limit=20")
      .then(r => r.json())
      .then(data => { setScHistory(Array.isArray(data) ? data : []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const noiseColor = s.noise > 65 ? "#f87171" : s.noise > 50 ? "#fbbf24" : "#34d399";
  const noiseLabel = s.noise > 65 ? "Too Noisy" : s.noise > 50 ? "Moderate" : "Comfortable";
  const noiseV     = s.noise > 65 ? "red" : s.noise > 50 ? "yellow" : "green";
  const lightColor = s.light < 250 ? "#f87171" : s.light < 500 ? "#fbbf24" : "#fbbf24";
  const lightLabel = s.light < 250 ? "Too Dark" : s.light < 500 ? "Dim" : "Well Lit";
  const lightV     = s.light < 250 ? "red" : s.light < 500 ? "yellow" : "green";

  const chartData = (key) =>
    scHistory.length
      ? [...scHistory].reverse().map(r => ({
          t: r.timestamp ? new Date(r.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }) : "—",
          v: r[key],
        }))
      : h[key === "noise" ? "noise" : "light"];

  return (
    <>
      <SectionHead title="Study Comfort — Light & Sound" icon="noise" />

      {/* Live value cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

        {/* Sound Level */}
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: noiseColor }}><Ico d={PATHS.noise} size={18} /></span>
              <span style={{ fontWeight: 700, fontSize: 13, color: "rgba(255,255,255,0.8)" }}>Sound Level</span>
            </div>
            <Badge label={noiseLabel} color={noiseV} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <RadialGauge value={s.noise} max={100} color={noiseColor} unit="dB" />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>Level</span>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 700, color: noiseColor }}>{s.noise} dB</span>
              </div>
              <Bar2 value={s.noise} max={100} color={noiseColor} />
              {s.noise > 65 && (
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 8,
                  padding: "5px 8px", borderRadius: 7, background: "rgba(248,113,113,0.09)", border: "1px solid rgba(248,113,113,0.18)" }}>
                  <span style={{ color: "#f87171" }}><Ico d={PATHS.alert} size={12} /></span>
                  <span style={{ fontSize: 10, color: "#f87171", fontWeight: 700 }}>Noise above comfortable level</span>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Light Level */}
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: lightColor }}><Ico d={PATHS.light} size={18} /></span>
              <span style={{ fontWeight: 700, fontSize: 13, color: "rgba(255,255,255,0.8)" }}>Light Level</span>
            </div>
            <Badge label={lightLabel} color={lightV} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <RadialGauge value={s.light} max={1000} color={lightColor} unit="lux" />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>Intensity</span>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 700, color: lightColor }}>{s.light} lx</span>
              </div>
              <Bar2 value={s.light} max={1000} color={lightColor} />
              {s.light < 250 && (
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 8,
                  padding: "5px 8px", borderRadius: 7, background: "rgba(248,113,113,0.09)", border: "1px solid rgba(248,113,113,0.18)" }}>
                  <span style={{ color: "#f87171" }}><Ico d={PATHS.alert} size={12} /></span>
                  <span style={{ fontSize: 10, color: "#f87171", fontWeight: 700 }}>Insufficient lighting</span>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Sound level chart */}
      <Card>
        <CardLabel text="Sound Level over Time (dB)" />
        <div style={{ height: 180 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData("noise")}>
              <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="t" tick={{ fontSize: 9, fill: "rgba(255,255,255,0.3)" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 9, fill: "rgba(255,255,255,0.3)" }} axisLine={false} tickLine={false} width={28} unit="dB" />
              <Tooltip content={<MiniTip />} />
              <Line type="monotone" dataKey="v" stroke={noiseColor} strokeWidth={2.5} dot={{ r: 3, fill: noiseColor }}
                style={{ filter: `drop-shadow(0 0 5px ${noiseColor}88)` }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Light level chart */}
      <Card>
        <CardLabel text="Light Level over Time (lux)" />
        <div style={{ height: 180 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData("light")}>
              <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="t" tick={{ fontSize: 9, fill: "rgba(255,255,255,0.3)" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 9, fill: "rgba(255,255,255,0.3)" }} axisLine={false} tickLine={false} width={32} unit=" lx" />
              <Tooltip content={<MiniTip />} />
              <Bar dataKey="v" fill={`${lightColor}33`} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Historical table */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <CardLabel text="Historical Readings Log (Firestore)" />
          {loading && <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>Loading...</span>}
          {!loading && scHistory.length === 0 && (
            <span style={{ fontSize: 10, color: "#fbbf24" }}>No records yet</span>
          )}
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'DM Mono',monospace", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                {["#", "Timestamp", "Sound (dB)", "Light (lux)", "Status"].map(col => (
                  <th key={col} style={{ padding: "7px 12px", textAlign: "left", fontSize: 10,
                    color: "rgba(255,255,255,0.35)", fontWeight: 700, letterSpacing: "0.06em",
                    fontFamily: "'DM Sans',sans-serif" }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {scHistory.map((row, i) => {
                const nC = row.noise > 65 ? "#f87171" : row.noise > 50 ? "#fbbf24" : "#34d399";
                const lC = row.light < 250 ? "#f87171" : row.light < 500 ? "#fbbf24" : "#fbbf24";
                const ok = row.noise <= 50 && row.light >= 500;
                const timeLabel = row.timestamp
                  ? new Date(row.timestamp).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })
                  : "—";
                return (
                  <tr key={row.id || i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)",
                    background: i === 0 ? "rgba(255,255,255,0.03)" : "transparent" }}>
                    <td style={{ padding: "7px 12px", color: "rgba(255,255,255,0.25)" }}>{scHistory.length - i}</td>
                    <td style={{ padding: "7px 12px", color: "rgba(255,255,255,0.5)" }}>{timeLabel}</td>
                    <td style={{ padding: "7px 12px", color: nC, fontWeight: 700 }}>{row.noise ?? "—"}</td>
                    <td style={{ padding: "7px 12px", color: lC, fontWeight: 700 }}>{row.light ?? "—"}</td>
                    <td style={{ padding: "7px 12px" }}>
                      <Badge label={ok ? "Good" : "Needs Attention"} color={ok ? "green" : "yellow"} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

// ── Activity Log Tab ──────────────────────────────────────────────────────────
const ADMIN_PASSWORD = "12345678";

function ActivityLogTab({ maxOccupancy, setMaxOccupancy, countTolerance, setCountTolerance }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [pw, setPw] = useState("");
  const [pwError, setPwError] = useState("");

  // Notice board state
  const [notices, setNotices] = useState([
    { id: 1, title: "Library Closed on Public Holidays", body: "The library will remain closed on all gazetted public holidays. Plan your visits accordingly.", date: "Apr 8, 2026", pinned: true },
    { id: 2, title: "Silence Policy Reminder", body: "Please maintain noise levels below 50 dB in all study areas. Loud conversations are not permitted.", date: "Apr 7, 2026", pinned: false },
    { id: 3, title: "Wi-Fi Maintenance Scheduled", body: "Network maintenance is scheduled for Apr 10 from 11 PM – 2 AM. Internet access will be unavailable during this window.", date: "Apr 6, 2026", pinned: false },
  ]);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [editId, setEditId] = useState(null);

  // Occupancy inputs (local strings; actual values live in parent)
  const [maxInput, setMaxInput] = useState(String(maxOccupancy));
  const [tolInput, setTolInput] = useState(String(countTolerance));

  const handleLogin = () => {
    if (pw === ADMIN_PASSWORD) {
      setIsAdmin(true);
      setShowLogin(false);
      setPw("");
      setPwError("");
    } else {
      setPwError("Incorrect password. Try again.");
    }
  };

  const handleAdd = () => {
    if (!newTitle.trim() || !newBody.trim()) return;
    const now = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    if (editId !== null) {
      setNotices(prev => prev.map(n => n.id === editId ? { ...n, title: newTitle, body: newBody } : n));
      setEditId(null);
    } else {
      setNotices(prev => [{ id: Date.now(), title: newTitle, body: newBody, date: now, pinned: false }, ...prev]);
    }
    setNewTitle("");
    setNewBody("");
  };

  const handleDelete = (id) => setNotices(prev => prev.filter(n => n.id !== id));
  const handlePin   = (id) => setNotices(prev => prev.map(n => n.id === id ? { ...n, pinned: !n.pinned } : n));
  const handleEdit  = (n)  => { setEditId(n.id); setNewTitle(n.title); setNewBody(n.body); };

  const handleSetMax = () => {
    const v = parseInt(maxInput, 10);
    if (!isNaN(v) && v > 0) setMaxOccupancy(v);
  };

  const handleSetTolerance = () => {
    const v = parseInt(tolInput, 10);
    if (!isNaN(v)) setCountTolerance(v);
  };

  const sorted = [...notices].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  const inputStyle = {
    padding: "9px 14px", borderRadius: 9,
    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)",
    color: "white", fontSize: 13, outline: "none", fontFamily: "'DM Sans',sans-serif",
  };

  return (
    <>
      <SectionHead title="Notice Board" icon="book" />

      {/* ── Login / logout strip ── */}
      {!isAdmin && !showLogin && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
          <button onClick={() => setShowLogin(true)} style={{
            display: "flex", alignItems: "center", gap: 7, padding: "8px 18px",
            background: "rgba(96,165,250,0.12)", border: "1px solid rgba(96,165,250,0.3)",
            borderRadius: 10, color: "#60a5fa", fontSize: 12, fontWeight: 700,
            fontFamily: "'DM Sans',sans-serif", cursor: "pointer",
          }}>
            <Ico d={PATHS.user} size={14} /> Admin Login
          </button>
        </div>
      )}

      {/* ── Login card ── */}
      {showLogin && (
        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <span style={{ color: "#60a5fa" }}><Ico d={PATHS.user} size={16} /></span>
            <span style={{ fontWeight: 700, fontSize: 14, color: "rgba(255,255,255,0.85)" }}>Admin Login</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 320 }}>
            <input
              type="password"
              placeholder="Enter admin password"
              value={pw}
              onChange={e => { setPw(e.target.value); setPwError(""); }}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              style={{ ...inputStyle, fontFamily: "'DM Mono',monospace" }}
            />
            {pwError && <span style={{ fontSize: 11, color: "#f87171" }}>{pwError}</span>}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleLogin} style={{
                flex: 1, padding: "9px", borderRadius: 9,
                background: "rgba(96,165,250,0.18)", border: "1px solid rgba(96,165,250,0.35)",
                color: "#60a5fa", fontWeight: 700, fontSize: 13, cursor: "pointer",
                fontFamily: "'DM Sans',sans-serif",
              }}>Login</button>
              <button onClick={() => { setShowLogin(false); setPw(""); setPwError(""); }} style={{
                flex: 1, padding: "9px", borderRadius: 9,
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.4)", fontWeight: 700, fontSize: 13,
                cursor: "pointer", fontFamily: "'DM Sans',sans-serif",
              }}>Cancel</button>
            </div>
          </div>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          ADMIN DASHBOARD — only visible after login
      ══════════════════════════════════════════════════════════════════════ */}
      {isAdmin && (
        <div style={{
          border: "1px solid rgba(96,165,250,0.3)",
          borderRadius: 16,
          padding: 20,
          marginBottom: 18,
          background: "rgba(96,165,250,0.04)",
        }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ color: "#60a5fa" }}><Ico d={PATHS.user} size={18} /></span>
              <span style={{ fontWeight: 800, fontSize: 15, color: "#60a5fa" }}>Admin Dashboard</span>
              <span style={{ fontSize: 10, background: "rgba(52,211,153,0.12)", color: "#34d399",
                border: "1px solid rgba(52,211,153,0.25)", borderRadius: 6, padding: "2px 8px",
                fontWeight: 700 }}>● ACTIVE</span>
            </div>
            <button onClick={() => setIsAdmin(false)} style={{
              padding: "6px 14px", background: "rgba(248,113,113,0.1)",
              border: "1px solid rgba(248,113,113,0.25)", borderRadius: 8,
              color: "#f87171", fontSize: 11, fontWeight: 700, cursor: "pointer",
              fontFamily: "'DM Sans',sans-serif",
            }}>Logout</button>
          </div>

          {/* ── Section 1: Occupancy Max Control ── */}
          <div style={{
            border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12,
            padding: 16, marginBottom: 16, background: "rgba(255,255,255,0.02)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <span style={{ color: "#fbbf24" }}><Ico d={PATHS.people} size={15} /></span>
              <span style={{ fontWeight: 700, fontSize: 13, color: "rgba(255,255,255,0.8)" }}>Current Occupancy — Maximum Limit</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
                background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)",
                borderRadius: 10 }}>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Current max:</span>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 18, fontWeight: 800, color: "#fbbf24" }}>{maxOccupancy}</span>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>persons</span>
              </div>
              <input
                type="number"
                min={1}
                max={500}
                value={maxInput}
                onChange={e => setMaxInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSetMax()}
                placeholder="New max"
                style={{ ...inputStyle, width: 100, fontFamily: "'DM Mono',monospace", textAlign: "center" }}
              />
              <button onClick={handleSetMax} style={{
                padding: "9px 18px", borderRadius: 9,
                background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.3)",
                color: "#fbbf24", fontWeight: 700, fontSize: 13, cursor: "pointer",
                fontFamily: "'DM Sans',sans-serif",
              }}>Set Limit</button>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontStyle: "italic" }}>
                Alerts will trigger when occupancy exceeds this value.
              </span>
            </div>
          </div>

          {/* ── Section 2: Count Tolerance / Correction ── */}
          <div style={{
            border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12,
            padding: 16, marginBottom: 16, background: "rgba(255,255,255,0.02)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ color: "#60a5fa" }}><Ico d={PATHS.eye} size={15} /></span>
              <span style={{ fontWeight: 700, fontSize: 13, color: "rgba(255,255,255,0.8)" }}>Count Correction (Tolerance)</span>
            </div>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", margin: "0 0 12px",
              fontFamily: "'DM Sans',sans-serif", lineHeight: 1.6 }}>
              If the sensor reads a wrong value, set a tolerance offset here.<br />
              Example: sensor reads <b style={{ color: "rgba(255,255,255,0.6)" }}>5</b>, actual is <b style={{ color: "rgba(255,255,255,0.6)" }}>3</b> → set <b style={{ color: "#60a5fa" }}>−2</b>.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
                background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.2)",
                borderRadius: 10 }}>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Active offset:</span>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 18, fontWeight: 800,
                  color: countTolerance === 0 ? "rgba(255,255,255,0.4)" : countTolerance > 0 ? "#34d399" : "#f87171" }}>
                  {countTolerance > 0 ? `+${countTolerance}` : countTolerance}
                </span>
              </div>
              <input
                type="number"
                value={tolInput}
                onChange={e => setTolInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSetTolerance()}
                placeholder="e.g. -2"
                style={{ ...inputStyle, width: 100, fontFamily: "'DM Mono',monospace", textAlign: "center" }}
              />
              <button onClick={handleSetTolerance} style={{
                padding: "9px 18px", borderRadius: 9,
                background: "rgba(96,165,250,0.15)", border: "1px solid rgba(96,165,250,0.3)",
                color: "#60a5fa", fontWeight: 700, fontSize: 13, cursor: "pointer",
                fontFamily: "'DM Sans',sans-serif",
              }}>Apply</button>
              {countTolerance !== 0 && (
                <button onClick={() => { setCountTolerance(0); setTolInput("0"); }} style={{
                  padding: "9px 14px", borderRadius: 9,
                  background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)",
                  color: "#f87171", fontWeight: 700, fontSize: 13, cursor: "pointer",
                  fontFamily: "'DM Sans',sans-serif",
                }}>Reset</button>
              )}
            </div>
          </div>

          {/* ── Section 3: Notice Board Controls ── */}
          <div style={{
            border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12,
            padding: 16, background: "rgba(255,255,255,0.02)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <span style={{ color: "#fbbf24" }}><Ico d={PATHS.alert} size={15} /></span>
              <span style={{ fontWeight: 700, fontSize: 13, color: "rgba(255,255,255,0.8)" }}>
                {editId !== null ? "Edit Notice" : "Post New Notice"}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input
                type="text"
                placeholder="Notice title"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                style={inputStyle}
              />
              <textarea
                placeholder="Notice content"
                value={newBody}
                onChange={e => setNewBody(e.target.value)}
                rows={3}
                style={{ ...inputStyle, resize: "vertical" }}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={handleAdd} disabled={!newTitle.trim() || !newBody.trim()} style={{
                  padding: "9px 20px", borderRadius: 9,
                  background: (!newTitle.trim() || !newBody.trim()) ? "rgba(255,255,255,0.05)" : "rgba(52,211,153,0.15)",
                  border: `1px solid ${(!newTitle.trim() || !newBody.trim()) ? "rgba(255,255,255,0.1)" : "rgba(52,211,153,0.3)"}`,
                  color: (!newTitle.trim() || !newBody.trim()) ? "rgba(255,255,255,0.2)" : "#34d399",
                  fontWeight: 700, fontSize: 13,
                  cursor: (!newTitle.trim() || !newBody.trim()) ? "default" : "pointer",
                  fontFamily: "'DM Sans',sans-serif",
                }}>{editId !== null ? "Save Changes" : "Post Notice"}</button>
                {editId !== null && (
                  <button onClick={() => { setEditId(null); setNewTitle(""); setNewBody(""); }} style={{
                    padding: "9px 16px", borderRadius: 9,
                    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                    color: "rgba(255,255,255,0.4)", fontWeight: 700, fontSize: 13,
                    cursor: "pointer", fontFamily: "'DM Sans',sans-serif",
                  }}>Cancel</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ Notice Board (public view, always visible) ══ */}
      <div style={{
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 16,
        padding: 18,
        background: "rgba(255,255,255,0.01)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16,
          paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <span style={{ color: "#fbbf24" }}><Ico d={PATHS.book} size={16} /></span>
          <span style={{ fontWeight: 800, fontSize: 14, color: "rgba(255,255,255,0.85)",
            letterSpacing: "0.04em", fontFamily: "'DM Sans',sans-serif" }}>NOTICE BOARD</span>
          <span style={{ fontSize: 11, background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.35)",
            borderRadius: 6, padding: "2px 8px", fontWeight: 700 }}>{sorted.length} notices</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {sorted.map(n => (
            <div key={n.id} style={{
              padding: 14, borderRadius: 12,
              border: n.pinned ? "1px solid rgba(251,191,36,0.3)" : "1px solid rgba(255,255,255,0.07)",
              background: n.pinned ? "rgba(251,191,36,0.04)" : "rgba(255,255,255,0.02)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  {n.pinned && (
                    <span style={{ fontSize: 10, background: "rgba(251,191,36,0.12)", color: "#fbbf24",
                      border: "1px solid rgba(251,191,36,0.25)", borderRadius: 6, padding: "2px 8px",
                      fontWeight: 700, fontFamily: "'DM Sans',sans-serif" }}>📌 PINNED</span>
                  )}
                  <span style={{ fontWeight: 700, fontSize: 13, color: "rgba(255,255,255,0.9)",
                    fontFamily: "'DM Sans',sans-serif" }}>{n.title}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)",
                    fontFamily: "'DM Mono',monospace" }}>{n.date}</span>
                  {isAdmin && (
                    <>
                      <button onClick={() => handlePin(n.id)} title={n.pinned ? "Unpin" : "Pin"} style={{
                        background: "none", border: "none", cursor: "pointer", padding: "2px 5px",
                        color: n.pinned ? "#fbbf24" : "rgba(255,255,255,0.3)", fontSize: 14,
                      }}>📌</button>
                      <button onClick={() => handleEdit(n)} style={{
                        background: "none", border: "none", cursor: "pointer", padding: "2px 5px",
                        color: "#60a5fa", fontSize: 14,
                      }}>✎</button>
                      <button onClick={() => handleDelete(n.id)} style={{
                        background: "none", border: "none", cursor: "pointer", padding: "2px 5px",
                        color: "#f87171", fontSize: 14,
                      }}>✕</button>
                    </>
                  )}
                </div>
              </div>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.65, margin: 0,
                fontFamily: "'DM Sans',sans-serif" }}>{n.body}</p>
            </div>
          ))}

          {sorted.length === 0 && (
            <p style={{ textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 13,
              fontFamily: "'DM Sans',sans-serif", margin: "20px 0" }}>No notices posted yet.</p>
          )}
        </div>
      </div>
    </>
  );
}

// ── Zones & Net Tab ───────────────────────────────────────────────────────────
function ZonesTab({ s, h }) {
  const [zHistory, setZHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/history?limit=20")
      .then(r => r.json())
      .then(data => { setZHistory(Array.isArray(data) ? data : []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Colors/labels for Traffic Level (0–100 %)
  const tlv = s.traffic_level ?? 0;
  const tlColor = tlv >= 80 ? "#f87171" : tlv >= 50 ? "#fbbf24" : "#34d399";
  const tlLabel = tlv >= 80 ? "Congested" : tlv >= 50 ? "Moderate" : "Low";
  const tlV     = tlv >= 80 ? "red"       : tlv >= 50 ? "yellow"   : "green";

  // Colors/labels for Network Speed (0–500 Mbps)
  const spd = s.speed ?? 0;
  const spdColor = spd < 50 ? "#f87171" : spd < 150 ? "#fbbf24" : "#34d399";
  const spdLabel = spd < 50 ? "Slow" : spd < 150 ? "Fair" : "Fast";
  const spdV     = spd < 50 ? "red"  : spd < 150 ? "yellow" : "green";

  // Colors/labels for Latency (ms) — lower is better
  const lat = s.latency ?? 0;
  const latColor = lat > 60 ? "#f87171" : lat > 30 ? "#fbbf24" : "#34d399";
  const latLabel = lat > 60 ? "High" : lat > 30 ? "Moderate" : "Low";
  const latV     = lat > 60 ? "red"  : lat > 30 ? "yellow"   : "green";

  // Build chart data — prefer Firestore history, fall back to in-memory rolling
  const chartData = (key, fallbackKey) =>
    zHistory.length
      ? [...zHistory].reverse().map(r => ({
          t: r.timestamp
            ? new Date(r.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })
            : "—",
          v: r[key],
        }))
      : (h[fallbackKey] || []);

  return (
    <>
      <SectionHead title="Zones & Network" icon="signal" />

      {/* Live metric cards — 3 equal columns */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>

        {/* Traffic Level */}
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: tlColor }}><Ico d={PATHS.signal} size={18} /></span>
              <span style={{ fontWeight: 700, fontSize: 13, color: "rgba(255,255,255,0.8)" }}>Traffic Level</span>
            </div>
            <Badge label={tlLabel} color={tlV} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <RadialGauge value={tlv} max={100} color={tlColor} unit="%" />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>Load</span>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 700, color: tlColor }}>{tlv}%</span>
              </div>
              <Bar2 value={tlv} max={100} color={tlColor} />
              {tlv >= 80 && (
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 8,
                  padding: "5px 8px", borderRadius: 7, background: "rgba(248,113,113,0.09)", border: "1px solid rgba(248,113,113,0.18)" }}>
                  <span style={{ color: "#f87171" }}><Ico d={PATHS.alert} size={12} /></span>
                  <span style={{ fontSize: 10, color: "#f87171", fontWeight: 700 }}>Network heavily loaded</span>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Network Speed */}
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: spdColor }}><Ico d={PATHS.wifi} size={18} /></span>
              <span style={{ fontWeight: 700, fontSize: 13, color: "rgba(255,255,255,0.8)" }}>Network Speed</span>
            </div>
            <Badge label={spdLabel} color={spdV} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <RadialGauge value={spd} max={500} color={spdColor} unit="Mbps" />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>Speed</span>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 700, color: spdColor }}>{spd} Mbps</span>
              </div>
              <Bar2 value={spd} max={500} color={spdColor} />
              {spd < 50 && (
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 8,
                  padding: "5px 8px", borderRadius: 7, background: "rgba(248,113,113,0.09)", border: "1px solid rgba(248,113,113,0.18)" }}>
                  <span style={{ color: "#f87171" }}><Ico d={PATHS.alert} size={12} /></span>
                  <span style={{ fontSize: 10, color: "#f87171", fontWeight: 700 }}>Speed critically low</span>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Network Latency */}
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: latColor }}><Ico d={PATHS.clock} size={18} /></span>
              <span style={{ fontWeight: 700, fontSize: 13, color: "rgba(255,255,255,0.8)" }}>Network Latency</span>
            </div>
            <Badge label={latLabel} color={latV} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <RadialGauge value={lat} max={120} color={latColor} unit="ms" />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>Ping</span>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 700, color: latColor }}>{lat} ms</span>
              </div>
              <Bar2 value={lat} max={120} color={latColor} />
              {lat > 60 && (
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 8,
                  padding: "5px 8px", borderRadius: 7, background: "rgba(248,113,113,0.09)", border: "1px solid rgba(248,113,113,0.18)" }}>
                  <span style={{ color: "#f87171" }}><Ico d={PATHS.alert} size={12} /></span>
                  <span style={{ fontSize: 10, color: "#f87171", fontWeight: 700 }}>High latency detected</span>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Charts row: Traffic + Speed */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Card>
          <CardLabel text="Traffic Level over Time (%)" />
          <div style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData("traffic_level", "speed")}>
                <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="t" tick={{ fontSize: 9, fill: "rgba(255,255,255,0.3)" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 9, fill: "rgba(255,255,255,0.3)" }} axisLine={false} tickLine={false} width={28} unit="%" domain={[0, 100]} />
                <Tooltip content={<MiniTip />} />
                <Bar dataKey="v" fill={`${tlColor}33`} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardLabel text="Network Speed over Time (Mbps)" />
          <div style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData("speed", "speed")}>
                <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="t" tick={{ fontSize: 9, fill: "rgba(255,255,255,0.3)" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 9, fill: "rgba(255,255,255,0.3)" }} axisLine={false} tickLine={false} width={36} unit=" Mbps" />
                <Tooltip content={<MiniTip />} />
                <Line type="monotone" dataKey="v" stroke={spdColor} strokeWidth={2.5} dot={{ r: 3, fill: spdColor }}
                  style={{ filter: `drop-shadow(0 0 5px ${spdColor}88)` }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Latency chart full width */}
      <Card>
        <CardLabel text="Network Latency over Time (ms)" />
        <div style={{ height: 180 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData("latency", "latency")}>
              <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="t" tick={{ fontSize: 9, fill: "rgba(255,255,255,0.3)" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 9, fill: "rgba(255,255,255,0.3)" }} axisLine={false} tickLine={false} width={32} unit=" ms" />
              <Tooltip content={<MiniTip />} />
              <Line type="monotone" dataKey="v" stroke={latColor} strokeWidth={2.5} dot={{ r: 3, fill: latColor }}
                style={{ filter: `drop-shadow(0 0 5px ${latColor}88)` }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Historical table */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <CardLabel text="Historical Network Log (Firestore)" />
          {loading && <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>Loading...</span>}
          {!loading && zHistory.length === 0 && (
            <span style={{ fontSize: 10, color: "#fbbf24" }}>No records yet</span>
          )}
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'DM Mono',monospace", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                {["#", "Timestamp", "Traffic (%)", "Speed (Mbps)", "Latency (ms)", "Status"].map(col => (
                  <th key={col} style={{ padding: "7px 12px", textAlign: "left", fontSize: 10,
                    color: "rgba(255,255,255,0.35)", fontWeight: 700, letterSpacing: "0.06em",
                    fontFamily: "'DM Sans',sans-serif" }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {zHistory.map((row, i) => {
                const tC = (row.traffic_level ?? 0) >= 80 ? "#f87171" : (row.traffic_level ?? 0) >= 50 ? "#fbbf24" : "#34d399";
                const sC = (row.speed ?? 0) < 50 ? "#f87171" : (row.speed ?? 0) < 150 ? "#fbbf24" : "#34d399";
                const lC = (row.latency ?? 0) > 60 ? "#f87171" : (row.latency ?? 0) > 30 ? "#fbbf24" : "#34d399";
                const ok = (row.traffic_level ?? 0) < 80 && (row.speed ?? 0) >= 150 && (row.latency ?? 0) <= 30;
                const timeLabel = row.timestamp
                  ? new Date(row.timestamp).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })
                  : "—";
                return (
                  <tr key={row.id || i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)",
                    background: i === 0 ? "rgba(255,255,255,0.03)" : "transparent" }}>
                    <td style={{ padding: "7px 12px", color: "rgba(255,255,255,0.25)" }}>{zHistory.length - i}</td>
                    <td style={{ padding: "7px 12px", color: "rgba(255,255,255,0.5)" }}>{timeLabel}</td>
                    <td style={{ padding: "7px 12px", color: tC, fontWeight: 700 }}>{row.traffic_level ?? "—"}</td>
                    <td style={{ padding: "7px 12px", color: sC, fontWeight: 700 }}>{row.speed ?? "—"}</td>
                    <td style={{ padding: "7px 12px", color: lC, fontWeight: 700 }}>{row.latency ?? "—"}</td>
                    <td style={{ padding: "7px 12px" }}>
                      <Badge label={ok ? "Optimal" : "Degraded"} color={ok ? "green" : "yellow"} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

// ── Access Tab ────────────────────────────────────────────────────────────────
function AccessTab({ s, maxOccupancy, countTolerance }) {
  const [accessLog, setAccessLog] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLog = () => {
      fetch("/api/access-log?limit=30")
        .then(r => r.json())
        .then(data => { setAccessLog(Array.isArray(data) ? data : []); })
        .catch(() => {})
        .finally(() => setLoading(false));
    };
    fetchLog();
    const id = setInterval(fetchLog, 5000);
    return () => clearInterval(id);
  }, []);

  const adjCount = Math.max(0, (s.count ?? 0) + countTolerance);
  const countColor = adjCount >= maxOccupancy * 0.8 ? "#f87171" : adjCount >= maxOccupancy * 0.5 ? "#fbbf24" : "#34d399";
  const countV = adjCount >= maxOccupancy * 0.8 ? "red" : adjCount >= maxOccupancy * 0.5 ? "yellow" : "green";
  const libColor = s.is_librarian ? "#34d399" : "#f87171";

  const TYPE_META = {
    ENTRY:         { label: "Entry",          color: "#34d399", icon: PATHS.entry },
    EXIT:          { label: "Exit",           color: "#f87171", icon: PATHS.exit  },
    LIBRARIAN_IN:  { label: "Librarian In",   color: "#818cf8", icon: PATHS.user  },
    LIBRARIAN_OUT: { label: "Librarian Out",  color: "#fbbf24", icon: PATHS.user  },
  };

  return (
    <>
      <SectionHead title="Access & Occupancy" icon="people" />

      {/* Top row: count + librarian */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

        {/* Occupancy count */}
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: countColor }}><Ico d={PATHS.people} size={18} /></span>
              <span style={{ fontWeight: 700, fontSize: 13, color: "rgba(255,255,255,0.8)" }}>Current Occupancy</span>
            </div>
            <Badge label={adjCount >= maxOccupancy * 0.8 ? "Crowded" : adjCount >= maxOccupancy * 0.5 ? "Moderate" : "Low"} color={countV} />
          </div>
          <div style={{ textAlign: "center", margin: "12px 0" }}>
            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 72, fontWeight: 800,
              color: countColor, lineHeight: 1, textShadow: `0 0 30px ${countColor}55` }}>
              {adjCount}
            </span>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 4 }}>people inside</div>
            {countTolerance !== 0 && (
              <div style={{ fontSize: 10, marginTop: 4, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono',monospace" }}>
                raw {s.count} {countTolerance > 0 ? "+" : ""}{countTolerance} offset
              </div>
            )}
          </div>
          <Bar2 value={adjCount} max={maxOccupancy} color={countColor} h={8} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>0</span>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>Max {maxOccupancy}</span>
          </div>
        </Card>

        {/* Librarian status */}
        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <span style={{ color: libColor }}><Ico d={PATHS.user} size={18} /></span>
            <span style={{ fontWeight: 700, fontSize: 13, color: "rgba(255,255,255,0.8)" }}>Librarian Status</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            padding: "24px 0", gap: 14 }}>
            <div style={{ width: 80, height: 80, borderRadius: "50%", display: "flex",
              alignItems: "center", justifyContent: "center",
              background: s.is_librarian ? "rgba(52,211,153,0.12)" : "rgba(248,113,113,0.12)",
              border: `2px solid ${libColor}44`,
              boxShadow: `0 0 24px ${libColor}33` }}>
              <Ico d={PATHS.user} size={36} sw={1.5} />
            </div>
            <Badge label={s.is_librarian ? "Librarian Present" : "Librarian Not Present"} color={s.is_librarian ? "green" : "red"} />
          </div>
          <div style={{ padding: "10px 14px", borderRadius: 10, textAlign: "center",
            background: s.is_librarian ? "rgba(52,211,153,0.07)" : "rgba(248,113,113,0.07)",
            border: `1px solid ${libColor}22` }}>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
              {s.is_librarian ? "Library is supervised" : "Library is unsupervised"}
            </span>
          </div>
        </Card>
      </div>

      {/* Access event log */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <CardLabel text="Entry / Exit Event Log (Firestore)" />
          {loading && <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>Loading...</span>}
          {!loading && accessLog.length === 0 && (
            <span style={{ fontSize: 10, color: "#fbbf24" }}>No events yet — logged only when count changes</span>
          )}
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'DM Mono',monospace", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                {["#", "Timestamp", "Event", "Count After", "Librarian"].map(col => (
                  <th key={col} style={{ padding: "7px 12px", textAlign: "left", fontSize: 10,
                    color: "rgba(255,255,255,0.35)", fontWeight: 700, letterSpacing: "0.06em",
                    fontFamily: "'DM Sans',sans-serif" }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {accessLog.map((row, i) => {
                const meta = TYPE_META[row.type] || { label: row.type, color: "#818cf8", icon: PATHS.clock };
                const timeLabel = row.timestamp
                  ? new Date(row.timestamp).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })
                  : "—";
                return (
                  <tr key={row.id || i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)",
                    background: i === 0 ? "rgba(255,255,255,0.03)" : "transparent" }}>
                    <td style={{ padding: "7px 12px", color: "rgba(255,255,255,0.25)" }}>{accessLog.length - i}</td>
                    <td style={{ padding: "7px 12px", color: "rgba(255,255,255,0.5)" }}>{timeLabel}</td>
                    <td style={{ padding: "7px 12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <span style={{ color: meta.color }}><Ico d={meta.icon} size={13} /></span>
                        <span style={{ color: meta.color, fontWeight: 700 }}>{meta.label}</span>
                      </div>
                    </td>
                    <td style={{ padding: "7px 12px", color: "white", fontWeight: 700 }}>{row.count ?? "—"}</td>
                    <td style={{ padding: "7px 12px" }}>
                      <Badge label={row.is_librarian ? "Present" : "Absent"} color={row.is_librarian ? "green" : "red"} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function LibraryIoTDashboard() {
  const [sensor, setSensor] = useState(null);
  const [activeNav, setActiveNav] = useState("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [now, setNow] = useState(new Date());
  const [history, setHistory] = useState({
    temp: [], humidity: [], aq: [], noise: [], latency: [], light: [], speed: []
  });
  const [useSimulated, setUseSimulated] = useState(false);
  const [firestoreHistory, setFirestoreHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [maxOccupancy, setMaxOccupancy] = useState(50);
  const [countTolerance, setCountTolerance] = useState(0);

  // Fetch Firestore history when Comfort tab is opened
  useEffect(() => {
    if (activeNav !== "comfort") return;
    setHistoryLoading(true);
    fetch("/api/history?limit=20")
      .then(r => r.json())
      .then(data => { setFirestoreHistory(Array.isArray(data) ? data : []); })
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, [activeNav]);

  // Helper to update simulated data
  const updateSimulated = () => {
    setSensor(prev => {
      if (!prev) prev = initSensor();
      return {
        noise: drift(prev.noise, 30, 90, 4),
        light: drift(prev.light, 120, 1000, 30),
        count: drift(prev.count, 5, 80, 2),
        is_librarian: Math.random() > 0.06 ? prev.is_librarian : !prev.is_librarian,
        temperature: drift(prev.temperature, 19, 34, 0.5),
        humidity: drift(prev.humidity, 30, 85, 1),
        airQuality: drift(prev.airQuality, 20, 200, 5),
        traffic_level: drift(prev.traffic_level, 0, 100, 6),
        speed: drift(prev.speed, 10, 600, 20),
        latency: drift(prev.latency, 2, 120, 4),
      };
    });
    setHistory(prev => {
      const s = sensor || initSensor();
      const t = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
      return {
        temp: [...prev.temp.slice(-19), { t, v: s.temperature }],
        humidity: [...prev.humidity.slice(-19), { t, v: s.humidity }],
        aq: [...prev.aq.slice(-19), { t, v: s.airQuality }],
        noise: [...prev.noise.slice(-19), { t, v: s.noise }],
        latency: [...prev.latency.slice(-19), { t, v: s.latency }],
        light: [...prev.light.slice(-19), { t, v: s.light }],
        speed: [...prev.speed.slice(-19), { t, v: s.speed }],
      };
    });
  };

  useEffect(() => {
    let intervalId;
    if (!useSimulated) {
      const fetchData = async () => {
        try {
          const res = await fetch("/api/readings");
          if (!res.ok) throw new Error("Network error");
          const data = await res.json();
          setSensor({
            noise: data.comfort.noise,
            light: data.comfort.light,
            count: data.occupancy.count,
            is_librarian: data.occupancy.is_librarian,
            temperature: data.environment.temperature,
            humidity: data.environment.humidity,
            airQuality: data.environment.airQuality,
            latency: data.activity.latency,
            speed: data.activity.speed,
            traffic_level: data.activity.traffic_level,
          });
          const t = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
          setHistory(prev => ({
            temp: [...prev.temp.slice(-19), { t, v: data.environment.temperature }],
            humidity: [...prev.humidity.slice(-19), { t, v: data.environment.humidity }],
            aq: [...prev.aq.slice(-19), { t, v: data.environment.airQuality }],
            noise: [...prev.noise.slice(-19), { t, v: data.comfort.noise }],
            latency: [...prev.latency.slice(-19), { t, v: data.activity.latency }],
            light: [...prev.light.slice(-19), { t, v: data.comfort.light }],
            speed: [...prev.speed.slice(-19), { t, v: data.activity.speed }],
          }));
        } catch (e) {
          setUseSimulated(true);
        }
      };
      fetchData();
      intervalId = setInterval(() => {
        fetchData();
        setNow(new Date());
      }, 2000);
    } else {
      // Simulated mode
      if (!sensor) setSensor(initSensor());
      intervalId = setInterval(() => {
        updateSimulated();
        setNow(new Date());
      }, 2000);
    }
    return () => clearInterval(intervalId);
    // eslint-disable-next-line
  }, [useSimulated]);

  if (!sensor) {
    return (
      <div style={{ color: 'white', fontFamily: "'DM Sans',sans-serif", background: "#07091a", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        Loading data from backend...
      </div>
    );
  }

  const s = sensor;
  const h = history;

  // derived
  const noiseColor = s.noise > 65 ? "#f87171" : s.noise > 50 ? "#fbbf24" : "#34d399";
  const noiseLabel = s.noise > 65 ? "Too Noisy" : s.noise > 50 ? "Moderate" : "Comfortable";
  const noiseV     = s.noise > 65 ? "red" : s.noise > 50 ? "yellow" : "green";
  const lightColor = s.light < 250 ? "#f87171" : s.light < 500 ? "#fbbf24" : "#fbbf24";
  const lightLabel = s.light < 250 ? "Too Dark" : s.light < 500 ? "Dim" : "Well Lit";
  const lightV     = s.light < 250 ? "red" : s.light < 500 ? "yellow" : "green";
  const tempColor  = s.temperature > 30 ? "#f87171" : "#34d399";
  const tempV      = s.temperature > 30 ? "red" : "green";
  const humColor   = s.humidity > 70 ? "#fbbf24" : "#60a5fa";
  const humV       = s.humidity > 70 ? "yellow" : "blue";
  const aqColor    = s.airQuality >= 1800 ? "#f87171" : "#34d399";
  const aqV        = s.airQuality >= 1800 ? "red" : "green";
  const aqLabel    = s.airQuality >= 1800 ? "Fire / Smoke Detected" : "No Fire or Smoke";
  const latV       = s.latency > 60 ? "red" : s.latency > 30 ? "yellow" : "green";
  const latColor   = s.latency > 60 ? "#f87171" : s.latency > 30 ? "#fbbf24" : "#34d399";
  const trafficColor = s.traffic_level > 70 ? "#f87171" : s.traffic_level > 40 ? "#fbbf24" : "#34d399";
  const trafficLabel = s.traffic_level > 70 ? "High" : s.traffic_level > 40 ? "Moderate" : "Low";
  const trafficV   = s.traffic_level > 70 ? "red" : s.traffic_level > 40 ? "yellow" : "green";
  const speedColor = s.speed > 400 ? "#34d399" : s.speed > 150 ? "#fbbf24" : "#f87171";
  const speedV     = s.speed > 400 ? "green" : s.speed > 150 ? "yellow" : "red";

  const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const dateStr = now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });

  const NAV = [
    { id: "dashboard", icon: "grid",     label: "Dashboard" },
    { id: "comfort",   icon: "light",    label: "Environment Comfort" },
    { id: "access",    icon: "people",   label: "Count & Access" },
    { id: "env",       icon: "noise",    label: "Study Comfort" },
    { id: "zones",     icon: "signal",   label: "Zones & Net" },
    { id: "activity",  icon: "activity", label: "Activity Log" },
  ];

  return (
    <div style={{ fontFamily: "'DM Sans',sans-serif", background: "#07091a", height: "100vh", width: "100vw",
      display: "flex", color: "white", position: "fixed", inset: 0, overflow: "hidden" }}>

      {/* mesh bg */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        <div style={{ position: "absolute", width: 700, height: 700, top: -250, left: -250, borderRadius: "50%",
          background: "radial-gradient(circle,rgba(99,102,241,0.1) 0%,transparent 65%)" }} />
        <div style={{ position: "absolute", width: 600, height: 600, bottom: -200, right: -100, borderRadius: "50%",
          background: "radial-gradient(circle,rgba(16,185,129,0.07) 0%,transparent 65%)" }} />
        <div style={{ position: "absolute", width: 400, height: 400, top: "35%", left: "55%", borderRadius: "50%",
          background: "radial-gradient(circle,rgba(248,113,113,0.05) 0%,transparent 65%)" }} />
        {/* subtle grid lines */}
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.025 }}>
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M40 0 L0 0 0 40" fill="none" stroke="white" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* ── SIDEBAR ──────────────────────────────────────────────────────────── */}
      <aside style={{ width: collapsed ? 64 : 210, minHeight: "100vh", zIndex: 10, flexShrink: 0,
        background: "rgba(255,255,255,0.02)", borderRight: "1px solid rgba(255,255,255,0.06)",
        backdropFilter: "blur(20px)", transition: "width 0.28s ease",
        overflow: "hidden", display: "flex", flexDirection: "column" }}>

        {/* logo */}
        <div style={{ padding: "18px 14px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)",
          display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0,
            background: "linear-gradient(135deg,#818cf8 0%,#34d399 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 14px rgba(129,140,248,0.4)" }}>
            <Ico d={PATHS.book} size={17} sw={2} />
          </div>
          {!collapsed && (
            <div>
              <div style={{ fontWeight: 800, fontSize: 12, letterSpacing: "0.05em", color: "white" }}>LIBRARY</div>
              <div style={{ fontSize: 8, letterSpacing: "0.14em", color: "rgba(255,255,255,0.3)", fontWeight: 700 }}>IOT MONITOR</div>
            </div>
          )}
        </div>

        {/* nav items */}
        <nav style={{ padding: "10px 8px", flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
          {NAV.map(({ id, icon, label }) => {
            const active = activeNav === id;
            return (
              <button key={id} onClick={() => setActiveNav(id)}
                title={collapsed ? label : ""}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 10,
                  padding: collapsed ? "10px" : "9px 12px",
                  justifyContent: collapsed ? "center" : "flex-start",
                  borderRadius: 10, border: active ? "1px solid rgba(129,140,248,0.25)" : "1px solid transparent",
                  background: active ? "rgba(129,140,248,0.13)" : "transparent",
                  color: active ? "#a5b4fc" : "rgba(255,255,255,0.35)",
                  fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 12.5,
                  cursor: "pointer", transition: "all 0.18s", textAlign: "left" }}>
                <span style={{ color: active ? "#818cf8" : "rgba(255,255,255,0.28)", flexShrink: 0 }}>
                  <Ico d={PATHS[icon]} size={17} />
                </span>
                {!collapsed && label}
              </button>
            );
          })}
        </nav>

        {/* collapse toggle */}
        <button onClick={() => setCollapsed(c => !c)}
          style={{ margin: "8px 10px", padding: 9, borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.03)",
            color: "rgba(255,255,255,0.3)", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Ico d={collapsed ? PATHS.chevR : PATHS.chevL} size={14} />
        </button>
      </aside>

      {/* ── MAIN ─────────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", zIndex: 1, minWidth: 0 }}>

        {/* HEADER */}
        <header style={{ height: 62, padding: "0 24px", display: "flex", alignItems: "center",
          justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(255,255,255,0.018)", backdropFilter: "blur(14px)", flexShrink: 0 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 17, letterSpacing: "-0.01em", color: "white" }}>
              Library IoT Dashboard
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", letterSpacing: "0.02em" }}>
              {dateStr}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* live clock */}
            <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "6px 13px",
              borderRadius: 999, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <span style={{ color: "#818cf8" }}><Ico d={PATHS.clock} size={14} /></span>
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 600,
                color: "rgba(255,255,255,0.65)" }}>{timeStr}</span>
            </div>
            {/* status pill */}
            <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "6px 14px",
              borderRadius: 999, background: "rgba(52,211,153,0.09)", border: "1px solid rgba(52,211,153,0.22)" }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#34d399",
                boxShadow: "0 0 8px #34d399", animation: "blink 2s infinite", display: "inline-block" }} />
              <span style={{ fontSize: 11, fontWeight: 800, color: "#34d399", letterSpacing: "0.05em" }}>SYSTEM ONLINE</span>
            </div>
          </div>
        </header>

        {/* CONTENT */}
        <main style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "16px 18px 24px",
          display: "flex", flexDirection: "column", gap: 16 }}>

          {/* ══ COMFORT TAB ═══════════════════════════════════════════════════ */}
          {activeNav === "comfort" && (
            <>
              <SectionHead title="Comfort — Real-Time Monitoring" icon="light" />

              {/* Top row: 3 live value cards */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>

                {/* Temperature */}
                <Card>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <span style={{ color: tempColor }}><Ico d={PATHS.temp} size={16} /></span>
                      <span style={{ fontWeight: 700, fontSize: 13, color: "rgba(255,255,255,0.75)" }}>Temperature</span>
                    </div>
                    <Badge label={s.temperature > 30 ? "HIGH" : "Normal"} color={tempV} />
                  </div>
                  <div style={{ textAlign: "center", margin: "8px 0" }}>
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 52, fontWeight: 800,
                      color: tempColor, lineHeight: 1, textShadow: `0 0 24px ${tempColor}44` }}>
                      {typeof s.temperature === "number" ? s.temperature.toFixed(1) : s.temperature}
                    </span>
                    <sup style={{ fontSize: 18, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Sans',sans-serif" }}>°C</sup>
                  </div>
                  <Bar2 value={s.temperature} max={40} color={tempColor} />
                  {s.temperature > 30 && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10,
                      padding: "6px 10px", borderRadius: 8,
                      background: "rgba(248,113,113,0.09)", border: "1px solid rgba(248,113,113,0.18)" }}>
                      <span style={{ color: "#f87171" }}><Ico d={PATHS.alert} size={13} /></span>
                      <span style={{ fontSize: 10, color: "#f87171", fontWeight: 700 }}>Above comfortable threshold</span>
                    </div>
                  )}
                </Card>

                {/* Humidity */}
                <Card>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <span style={{ color: humColor }}><Ico d={PATHS.drop} size={16} /></span>
                      <span style={{ fontWeight: 700, fontSize: 13, color: "rgba(255,255,255,0.75)" }}>Humidity</span>
                    </div>
                    <Badge label={s.humidity > 70 ? "HIGH" : "Normal"} color={humV} />
                  </div>
                  <div style={{ textAlign: "center", margin: "8px 0" }}>
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 52, fontWeight: 800,
                      color: humColor, lineHeight: 1, textShadow: `0 0 24px ${humColor}44` }}>
                      {s.humidity}
                    </span>
                    <sup style={{ fontSize: 18, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Sans',sans-serif" }}>%</sup>
                  </div>
                  <Bar2 value={s.humidity} max={100} color={humColor} />
                  {s.humidity > 70 && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10,
                      padding: "6px 10px", borderRadius: 8,
                      background: "rgba(251,191,36,0.09)", border: "1px solid rgba(251,191,36,0.18)" }}>
                      <span style={{ color: "#fbbf24" }}><Ico d={PATHS.alert} size={13} /></span>
                      <span style={{ fontSize: 10, color: "#fbbf24", fontWeight: 700 }}>High humidity detected</span>
                    </div>
                  )}
                </Card>

                {/* Smoke Detection */}
                <Card>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <span style={{ color: aqColor }}><Ico d={PATHS.alert} size={16} /></span>
                      <span style={{ fontWeight: 700, fontSize: 13, color: "rgba(255,255,255,0.75)" }}>Smoke Detection</span>
                    </div>
                    <Badge label={aqLabel} color={aqV} />
                  </div>
                  <div style={{ textAlign: "center", margin: "8px 0" }}>
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 52, fontWeight: 800,
                      color: aqColor, lineHeight: 1, textShadow: `0 0 24px ${aqColor}44` }}>
                      {s.airQuality}
                    </span>
                    <sup style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Sans',sans-serif", marginLeft: 4 }}>ppm</sup>
                  </div>
                  <Bar2 value={Math.min(s.airQuality, 2000)} max={2000} color={aqColor} />
                  {s.airQuality >= 1800 && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10,
                      padding: "6px 10px", borderRadius: 8,
                      background: "rgba(248,113,113,0.09)", border: "1px solid rgba(248,113,113,0.18)" }}>
                      <span style={{ color: "#f87171" }}><Ico d={PATHS.alert} size={13} /></span>
                      <span style={{ fontSize: 10, color: "#f87171", fontWeight: 700 }}>Fire / Smoke alert — threshold exceeded</span>
                    </div>
                  )}
                </Card>
              </div>

              {/* Temperature chart */}
              <Card>
                <CardLabel text="Temperature over Time (°C)" />
                <div style={{ height: 180 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={firestoreHistory.length ? [...firestoreHistory].reverse().map(r => ({ t: r.timestamp ? new Date(r.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }) : "—", v: r.temperature })) : h.temp}>
                      <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.04)" />
                      <XAxis dataKey="t" tick={{ fontSize: 9, fill: "rgba(255,255,255,0.3)" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 9, fill: "rgba(255,255,255,0.3)" }} axisLine={false} tickLine={false} width={28} unit="°C" />
                      <Tooltip content={<MiniTip />} />
                      <Line type="monotone" dataKey="v" stroke={tempColor} strokeWidth={2.5} dot={{ r: 3, fill: tempColor }}
                        style={{ filter: `drop-shadow(0 0 5px ${tempColor}88)` }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Humidity chart */}
              <Card>
                <CardLabel text="Humidity over Time (%)" />
                <div style={{ height: 180 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={firestoreHistory.length ? [...firestoreHistory].reverse().map(r => ({ t: r.timestamp ? new Date(r.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }) : "—", v: r.humidity })) : h.humidity}>
                      <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.04)" />
                      <XAxis dataKey="t" tick={{ fontSize: 9, fill: "rgba(255,255,255,0.3)" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 9, fill: "rgba(255,255,255,0.3)" }} axisLine={false} tickLine={false} width={28} unit="%" />
                      <Tooltip content={<MiniTip />} />
                      <Line type="monotone" dataKey="v" stroke={humColor} strokeWidth={2.5} dot={{ r: 3, fill: humColor }}
                        style={{ filter: `drop-shadow(0 0 5px ${humColor}88)` }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Historical data table from Firestore */}
              <Card>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <CardLabel text="Historical Readings Log (Firestore)" />
                  {historyLoading && <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>Loading...</span>}
                  {!historyLoading && firestoreHistory.length === 0 && (
                    <span style={{ fontSize: 10, color: "#fbbf24" }}>No records yet — will appear after first reading</span>
                  )}
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'DM Mono',monospace", fontSize: 12 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                        {["#", "Timestamp", "Temperature (°C)", "Humidity (%)", "Smoke (ppm)"].map(col => (
                          <th key={col} style={{ padding: "7px 12px", textAlign: "left", fontSize: 10,
                            color: "rgba(255,255,255,0.35)", fontWeight: 700, letterSpacing: "0.06em",
                            fontFamily: "'DM Sans',sans-serif" }}>{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {firestoreHistory.map((row, i) => {
                        const isSmoke = row.airQuality >= 1800;
                        const timeLabel = row.timestamp
                          ? new Date(row.timestamp).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })
                          : "—";
                        return (
                          <tr key={row.id || i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)",
                            background: i === 0 ? "rgba(255,255,255,0.03)" : "transparent" }}>
                            <td style={{ padding: "7px 12px", color: "rgba(255,255,255,0.25)" }}>{firestoreHistory.length - i}</td>
                            <td style={{ padding: "7px 12px", color: "rgba(255,255,255,0.5)" }}>{timeLabel}</td>
                            <td style={{ padding: "7px 12px", color: row.temperature > 30 ? "#f87171" : "#34d399", fontWeight: 700 }}>
                              {typeof row.temperature === "number" ? row.temperature.toFixed(1) : row.temperature ?? "—"}
                            </td>
                            <td style={{ padding: "7px 12px", color: row.humidity > 70 ? "#fbbf24" : "#60a5fa", fontWeight: 700 }}>
                              {row.humidity ?? "—"}
                            </td>
                            <td style={{ padding: "7px 12px", color: isSmoke ? "#f87171" : "#34d399", fontWeight: 700 }}>
                              {row.airQuality ?? "—"} {isSmoke && "⚠"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}

          {/* ══ ACCESS TAB ════════════════════════════════════════════════════ */}
          {activeNav === "access" && (
            <AccessTab s={s} maxOccupancy={maxOccupancy} countTolerance={countTolerance} />
          )}

          {/* ══ STUDY COMFORT TAB ═════════════════════════════════════════════ */}
          {activeNav === "env" && (
            <StudyComfortTab s={s} h={h} />
          )}

          {/* ══ ZONES & NET TAB ═══════════════════════════════════════════════ */}
          {activeNav === "zones" && (
            <ZonesTab s={s} h={h} />
          )}

          {/* ══ ACTIVITY LOG TAB ══════════════════════════════════════════════ */}
          {activeNav === "activity" && (
            <ActivityLogTab maxOccupancy={maxOccupancy} setMaxOccupancy={setMaxOccupancy} countTolerance={countTolerance} setCountTolerance={setCountTolerance} />
          )}

          {/* ══ SECTION A: Study Comfort ═══════════════════════════════════════ */}
          {activeNav === "dashboard" && <>
          <section>
            <SectionHead title="Study Comfort Monitoring" icon="noise" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

              {/* NOISE */}
              <Card>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: noiseColor }}><Ico d={PATHS.noise} size={18} /></span>
                    <span style={{ fontWeight: 700, fontSize: 13, color: "rgba(255,255,255,0.8)" }}>Noise Level</span>
                  </div>
                  <Badge label={noiseLabel} color={noiseV} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <RadialGauge value={s.noise} max={100} color={noiseColor} unit="dB" />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>Level</span>
                      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700, color: "white" }}>{s.noise} dB</span>
                    </div>
                    <Bar2 value={s.noise} max={100} color={noiseColor} />
                    <div style={{ height: 60, marginTop: 10 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={h.noise}>
                          <Line type="monotone" dataKey="v" stroke={noiseColor} strokeWidth={2} dot={false} />
                          <Tooltip content={<MiniTip />} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </Card>

              {/* LIGHT */}
              <Card>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: lightColor }}><Ico d={PATHS.light} size={18} /></span>
                    <span style={{ fontWeight: 700, fontSize: 13, color: "rgba(255,255,255,0.8)" }}>Light Intensity</span>
                  </div>
                  <Badge label={lightLabel} color={lightV} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <RadialGauge value={s.light} max={1000} color={lightColor} unit="lux" />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>Intensity</span>
                      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700, color: "white" }}>{s.light} lx</span>
                    </div>
                    <Bar2 value={s.light} max={1000} color={lightColor} />
                    <div style={{ height: 60, marginTop: 10 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={h.light}>
                          <Bar dataKey="v" fill={`${lightColor}33`} radius={[3,3,0,0]} />
                          <Tooltip content={<MiniTip />} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </section>

          {/* ══ SECTION B + C: Access & Environment ═══════════════════════════ */}
          <section>
            <div style={{ display: "grid", gridTemplateColumns: "1.05fr 1fr 1fr", gap: 14 }}>

              {/* ACCESS */}
              <Card>
                <CardLabel text="Library Access & Supervision" />

                {/* big occupancy */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "14px 16px", borderRadius: 14,
                  background: "rgba(129,140,248,0.07)", border: "1px solid rgba(129,140,248,0.14)",
                  marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginBottom: 3 }}>Currently Inside</div>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 38, fontWeight: 800,
                      color: "white", lineHeight: 1 }}>{Math.max(0, (s.count ?? 0) + countTolerance)}</div>
                    <div style={{ fontSize: 10, color: "#818cf8", fontWeight: 700, marginTop: 2 }}>occupants</div>
                    {countTolerance !== 0 && (
                      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", fontFamily: "'DM Mono',monospace", marginTop: 1 }}>
                        raw {s.count} / offset {countTolerance > 0 ? `+${countTolerance}` : countTolerance}
                      </div>
                    )}
                  </div>
                  <div style={{ width: 50, height: 50, borderRadius: "50%",
                    background: "rgba(129,140,248,0.12)", border: "2px solid rgba(129,140,248,0.28)",
                    display: "flex", alignItems: "center", justifyContent: "center", color: "#818cf8" }}>
                    <Ico d={PATHS.people} size={22} />
                  </div>
                </div>

                {/* occupancy bar */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>Capacity</span>
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: "rgba(255,255,255,0.5)" }}>{Math.max(0, (s.count ?? 0) + countTolerance)} / {maxOccupancy}</span>
                  </div>
                  <Bar2 value={Math.max(0, (s.count ?? 0) + countTolerance)} max={maxOccupancy} color={(Math.max(0, (s.count ?? 0) + countTolerance)) >= maxOccupancy * 0.8 ? "#f87171" : (Math.max(0, (s.count ?? 0) + countTolerance)) >= maxOccupancy * 0.5 ? "#fbbf24" : "#34d399"} />
                </div>

                {/* librarian */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 13px", borderRadius: 12,
                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: "rgba(255,255,255,0.35)" }}><Ico d={PATHS.user} size={15} /></span>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", fontWeight: 600 }}>Librarian</span>
                  </div>
                  <Badge label={s.is_librarian ? "Present" : "Not Present"} color={s.is_librarian ? "green" : "red"} />
                </div>
              </Card>

              {/* TEMPERATURE */}
              <Card>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={{ color: tempColor }}><Ico d={PATHS.temp} size={16} /></span>
                    <span style={{ fontWeight: 700, fontSize: 12, color: "rgba(255,255,255,0.75)" }}>Temperature</span>
                  </div>
                  <Badge label={s.temperature > 30 ? "HIGH" : "Normal"} color={tempV} />
                </div>

                <div style={{ textAlign: "center", marginBottom: 10 }}>
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 46, fontWeight: 800,
                    color: tempColor, lineHeight: 1, transition: "color 0.4s",
                    textShadow: `0 0 20px ${tempColor}44` }}>
                    {typeof s.temperature === 'number' ? s.temperature.toFixed(1) : s.temperature}
                  </span>
                  <sup style={{ fontSize: 16, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Sans',sans-serif" }}>°C</sup>
                </div>

                <Bar2 value={s.temperature} max={40} color={tempColor} />

                <div style={{ height: 72, marginTop: 12 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={h.temp}>
                      <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.04)" />
                      <Line type="monotone" dataKey="v" stroke={tempColor} strokeWidth={2} dot={false} />
                      <Tooltip content={<MiniTip />} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {s.temperature > 30 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10,
                    padding: "6px 10px", borderRadius: 8,
                    background: "rgba(248,113,113,0.09)", border: "1px solid rgba(248,113,113,0.18)" }}>
                    <span style={{ color: "#f87171" }}><Ico d={PATHS.alert} size={13} /></span>
                    <span style={{ fontSize: 10, color: "#f87171", fontWeight: 700 }}>Above comfortable threshold</span>
                  </div>
                )}
              </Card>

              {/* HUMIDITY + AIR */}
              <Card>
                <CardLabel text="Humidity & Smoke Detection" />

                {/* humidity */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ color: humColor }}><Ico d={PATHS.drop} size={14} /></span>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", fontWeight: 600 }}>Humidity</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 15, fontWeight: 800, color: humColor }}>{s.humidity}%</span>
                      {s.humidity > 70 && <Badge label="HIGH" color="yellow" />}
                    </div>
                  </div>
                  <Bar2 value={s.humidity} max={100} color={humColor} />
                  <div style={{ height: 48, marginTop: 6 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={h.humidity}>
                        <Line type="monotone" dataKey="v" stroke={humColor} strokeWidth={1.5} dot={false} />
                        <Tooltip content={<MiniTip />} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div style={{ height: 1, background: "rgba(255,255,255,0.05)", marginBottom: 14 }} />

                {/* smoke detection */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ color: aqColor }}><Ico d={PATHS.alert} size={14} /></span>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", fontWeight: 600 }}>Smoke Detection</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 15, fontWeight: 800, color: aqColor }}>{s.airQuality}</span>
                      <Badge label={aqLabel} color={aqV} />
                    </div>
                  </div>
                  <Bar2 value={Math.min(s.airQuality, 2000)} max={2000} color={aqColor} />
                  <div style={{ height: 48, marginTop: 6 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={h.aq}>
                        <Bar dataKey="v" fill={`${aqColor}33`} radius={[2,2,0,0]} />
                        <Tooltip content={<MiniTip />} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </Card>
            </div>
          </section>

          {/* ══ SECTION D: Activity ════════════════════════════════════════════ */}
          <section>
            <SectionHead title="Network Activity" icon="activity" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

              {/* TRAFFIC & SPEED */}
              <Card>
                <CardLabel text="Traffic Level & Network Speed" />

                {/* traffic level */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ color: trafficColor }}><Ico d={PATHS.signal} size={14} /></span>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", fontWeight: 600 }}>Traffic Level</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 15, fontWeight: 800, color: trafficColor }}>{s.traffic_level}</span>
                      <Badge label={trafficLabel} color={trafficV} />
                    </div>
                  </div>
                  <Bar2 value={s.traffic_level} max={100} color={trafficColor} />
                </div>

                <div style={{ height: 1, background: "rgba(255,255,255,0.05)", marginBottom: 14 }} />

                {/* speed */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ color: speedColor }}><Ico d={PATHS.activity} size={14} /></span>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", fontWeight: 600 }}>Network Speed</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 15, fontWeight: 800, color: speedColor }}>{s.speed} Mbps</span>
                      <Badge label={s.speed > 400 ? "Fast" : s.speed > 150 ? "Normal" : "Slow"} color={speedV} />
                    </div>
                  </div>
                  <Bar2 value={s.speed} max={600} color={speedColor} />
                  <div style={{ height: 60, marginTop: 8 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={h.speed}>
                        <Line type="monotone" dataKey="v" stroke={speedColor} strokeWidth={1.5} dot={false} />
                        <Tooltip content={<MiniTip />} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </Card>

              {/* LATENCY */}
              <Card>
                <CardLabel text="Network Latency" />

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "13px 15px", borderRadius: 13,
                  background: "rgba(96,165,250,0.07)", border: "1px solid rgba(96,165,250,0.14)",
                  marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginBottom: 5 }}>Current Latency</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 26, fontWeight: 800, color: latColor }}>{s.latency}</span>
                      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>ms</span>
                    </div>
                    <Badge label={s.latency > 60 ? "High" : s.latency > 30 ? "Medium" : "Low"} color={latV} />
                  </div>
                  <span style={{ color: latColor, opacity: 0.6 }}><Ico d={PATHS.clock} size={26} /></span>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <Bar2 value={s.latency} max={120} color={latColor} />
                </div>

                <div style={{ height: 100 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={h.latency}>
                      <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.04)" />
                      <XAxis dataKey="t" tick={{ fontSize: 9, fill: "rgba(255,255,255,0.25)" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: "rgba(255,255,255,0.25)" }} axisLine={false} tickLine={false} width={24} />
                      <Line type="monotone" dataKey="v" stroke={latColor} strokeWidth={2} dot={false}
                        style={{ filter: `drop-shadow(0 0 4px ${latColor}66)` }} />
                      <Tooltip content={<MiniTip />} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          </section>

          </>}

        </main>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&family=DM+Mono:wght@400;600;700;800&display=swap');
        @keyframes blink {
          0%,100% { opacity:1; transform:scale(1); }
          50%      { opacity:0.5; transform:scale(0.8); }
        }
        ::-webkit-scrollbar { width:5px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.1); border-radius:999px; }
      `}</style>
    </div>
  );
}
