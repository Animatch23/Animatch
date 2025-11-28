"use client";

export default function AdminAnalyticsPage() {
  // Mock data (replace with API later)
  const dau = 128; // Daily Active Users
  const matchesToday = 64;
  const avgWait = 24; // seconds
  const avgRating = 4.3; // out of 5

  const messagesTrend = [220, 240, 180, 260, 300, 280, 320];
  const matchesTrend = [40, 45, 38, 52, 61, 55, 64];
  const waitTrend = [35, 32, 28, 30, 27, 26, 24];

  return (
    <div className="px-4 md:px-6 py-4 md:py-6">
      <h1 className="text-2xl md:text-3xl font-bold text-brand-700 mb-4">Analytics</h1>
      <p className="text-gray-600 mb-6">Lightweight overview with mock data. Hook up to your API when ready.</p>

      {/* KPI Cards */}
      <div className="grid gap-4 md:gap-6 grid-cols-2 md:grid-cols-4 mb-6">
        <KpiCard title="DAU" value={dau} trend={messagesTrend} />
        <KpiCard title="Matches Today" value={matchesToday} trend={matchesTrend} />
        <KpiCard title="Avg Wait (s)" value={avgWait} trend={waitTrend} />
        <KpiCard title="Avg Rating" value={avgRating.toFixed(1)} trend={[4,4.2,4.1,4.3,4.4,4.3,4.3]} />
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Matches per day */}
        <Panel title="Matches - last 7 days">
          <MiniBars values={matchesTrend} colorClass="bg-brand-700/80" labels={["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]} />
        </Panel>

        {/* Wait time trend */}
        <Panel title="Median Wait (s) - last 7 days">
          <Sparkline values={waitTrend} stroke="#1E5A2F" fill="rgba(30,90,47,0.08)" />
        </Panel>
      </div>
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <div className="text-sm font-semibold text-gray-700 mb-3">{title}</div>
      {children}
    </div>
  );
}

function KpiCard({ title, value, trend }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-2xl md:text-3xl font-bold text-gray-900">{value}</div>
      <div className="mt-2 h-12">
        <Sparkline values={trend} />
      </div>
    </div>
  );
}

function Sparkline({ values = [], stroke = "#286633", fill = "rgba(40,102,51,0.12)" }) {
  if (!values.length) return null;
  const w = 260; // width
  const h = 48; // height
  const max = Math.max(...values);
  const min = Math.min(...values);
  const dx = w / (values.length - 1 || 1);
  const scaleY = (v) => {
    if (max === min) return h / 2;
    return h - ((v - min) / (max - min)) * h;
  };
  const points = values.map((v, i) => `${i * dx},${scaleY(v)}`).join(" ");

  // area path
  const area = `M0,${h} L ${points} L ${w},${h} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%" preserveAspectRatio="none">
      <path d={area} fill={fill} />
      <polyline points={points} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function MiniBars({ values = [], colorClass = "bg-gray-800", labels = [] }) {
  if (!values.length) return null;
  const max = Math.max(...values);
  return (
    <div className="flex items-end justify-between h-40 gap-2">
      {values.map((v, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-2">
          <div className={`w-full rounded-md ${colorClass}`} style={{ height: `${(v / max) * 100}%` }} />
          <div className="text-[10px] text-gray-500">{labels[i] || ''}</div>
        </div>
      ))}
    </div>
  );
}
