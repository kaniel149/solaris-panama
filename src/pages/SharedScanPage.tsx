import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Sun, Zap, Ruler, Building2, MapPin, ArrowLeft,
  Loader2, AlertCircle,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { getRoofScanByToken, type RoofScanRow } from '@/services/roofScanService';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function SharedScanPage() {
  const { token } = useParams<{ token: string }>();
  const [scan, setScan] = useState<RoofScanRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!token) return;
    getRoofScanByToken(token)
      .then((data) => {
        if (data) {
          setScan(data);
        } else {
          setError(true);
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#00ffcc] animate-spin" />
      </div>
    );
  }

  if (error || !scan) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-white mb-2">Scan Not Found</h2>
          <p className="text-sm text-[#8888a0] mb-6">
            This link may have expired or the scan was deleted.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#00ffcc]/10 text-[#00ffcc] rounded-lg text-sm hover:bg-[#00ffcc]/20 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const monthlyData = (scan.monthly_kwh && (scan.monthly_kwh as number[]).length > 0)
    ? (scan.monthly_kwh as number[]).map((kwh, i) => ({ month: MONTH_LABELS[i], kwh }))
    : [];

  const maxKwh = monthlyData.length > 0 ? Math.max(...monthlyData.map(d => d.kwh)) : 0;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <header className="border-b border-white/[0.06] bg-[#12121a]/80 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sun className="w-6 h-6 text-[#00ffcc]" />
            <span className="text-sm font-semibold text-[#00ffcc]">Solaris Panama</span>
          </div>
          <span className="text-xs text-[#555566]">Solar Roof Analysis</span>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Title */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-[#8888a0] text-sm mb-2">
            <MapPin className="w-4 h-4" />
            {scan.address}
          </div>
          <h1 className="text-2xl font-bold text-white">Solar Roof Analysis Report</h1>
          <p className="text-sm text-[#555566] mt-1">
            Scanned {new Date(scan.created_at).toLocaleDateString()} &middot;{' '}
            Quality: <span className={scan.quality === 'HIGH' ? 'text-green-400' : 'text-yellow-400'}>{scan.quality}</span>
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={<Ruler className="w-5 h-5" />}
            label="Total Roof"
            value={`${scan.total_roof_m2?.toFixed(0)} m²`}
            color="#0ea5e9"
          />
          <StatCard
            icon={<Building2 className="w-5 h-5" />}
            label="Usable Area"
            value={`${scan.usable_roof_m2?.toFixed(0)} m²`}
            color="#8b5cf6"
          />
          <StatCard
            icon={<Sun className="w-5 h-5" />}
            label="System Size"
            value={`${scan.system_kwp?.toFixed(1)} kWp`}
            color="#f59e0b"
          />
          <StatCard
            icon={<Zap className="w-5 h-5" />}
            label="Annual Production"
            value={`${scan.yearly_kwh?.toLocaleString()} kWh`}
            color="#00ffcc"
          />
        </div>

        {/* Monthly Chart */}
        {monthlyData.length > 0 && (
          <div className="bg-[#12121a]/80 border border-white/[0.06] rounded-2xl p-6 mb-8">
            <h3 className="text-sm font-medium text-[#c0c0d0] mb-4">Monthly Production Estimate</h3>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: '#555566' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#555566' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#1a1a2e',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#e0e0f0',
                    }}
                    formatter={(value: number) => [`${value.toLocaleString()} kWh`, 'Production']}
                  />
                  <Bar dataKey="kwh" radius={[4, 4, 0, 0]}>
                    {monthlyData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.kwh === maxKwh ? '#00ffcc' : '#00ffcc50'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* System Details */}
        <div className="bg-[#12121a]/80 border border-white/[0.06] rounded-2xl p-6 mb-8">
          <h3 className="text-sm font-medium text-[#c0c0d0] mb-4">System Details</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <DetailRow label="Panel Count" value={`${scan.panel_count} panels`} />
            <DetailRow label="System Size" value={`${scan.system_kwp?.toFixed(1)} kWp`} />
            <DetailRow label="Annual Output" value={`${scan.yearly_kwh?.toLocaleString()} kWh`} />
            <DetailRow label="Data Source" value={scan.source.replace(/_/g, ' ')} />
            <DetailRow label="Scan Quality" value={scan.quality} />
            <DetailRow label="Coordinates" value={`${scan.latitude}, ${scan.longitude}`} />
          </div>
        </div>

        {/* CTA */}
        <div className="text-center py-8 border-t border-white/[0.06]">
          <p className="text-sm text-[#8888a0] mb-4">
            Interested in solar for your building?
          </p>
          <a
            href="https://solarispanama.com"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#00ffcc]/10 text-[#00ffcc] border border-[#00ffcc]/20 rounded-xl text-sm font-medium hover:bg-[#00ffcc]/20 transition-colors"
          >
            <Sun className="w-4 h-4" />
            Get a Free Quote
          </a>
        </div>
      </main>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="bg-[#12121a]/80 border border-white/[0.06] rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2" style={{ color }}>
        {icon}
        <span className="text-xs text-[#8888a0]">{label}</span>
      </div>
      <div className="text-lg font-bold text-white">{value}</div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs text-[#555566]">{label}</span>
      <div className="text-sm text-[#c0c0d0] capitalize">{value}</div>
    </div>
  );
}
