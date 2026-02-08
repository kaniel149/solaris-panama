import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  Activity,
  Wifi,
  WifiOff,
  AlertTriangle,
  Sun,
  Zap,
  BarChart3,
  RefreshCw,
} from 'lucide-react';
import { Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatsCard } from '@/components/ui/StatsCard';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { MonitoringStatus } from '@/types/monitoring';

const cn = (...classes: (string | boolean | undefined | null)[]) => classes.filter(Boolean).join(' ');

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

interface MockSite {
  id: string;
  name: string;
  platform: string;
  capacity_kwp: number;
  today_kwh: number;
  current_power_kw: number;
  status: MonitoringStatus;
  performance_ratio: number;
  last_sync: string;
}

const mockSites: MockSite[] = [
  {
    id: 's1', name: 'Clinic San Fernando', platform: 'SolarEdge', capacity_kwp: 75,
    today_kwh: 285, current_power_kw: 62, status: 'active', performance_ratio: 94, last_sync: '2 min ago',
  },
  {
    id: 's2', name: 'Supermarket El Rey #4', platform: 'Enphase', capacity_kwp: 120,
    today_kwh: 412, current_power_kw: 98, status: 'active', performance_ratio: 88, last_sync: '5 min ago',
  },
  {
    id: 's3', name: 'Office Tower PH', platform: 'SolarEdge', capacity_kwp: 100,
    today_kwh: 0, current_power_kw: 0, status: 'offline', performance_ratio: 0, last_sync: '3 hours ago',
  },
  {
    id: 's4', name: 'Mall Multiplaza Rooftop', platform: 'Huawei', capacity_kwp: 200,
    today_kwh: 680, current_power_kw: 175, status: 'active', performance_ratio: 91, last_sync: '1 min ago',
  },
  {
    id: 's5', name: 'Warehouse PTY-08', platform: 'Sungrow', capacity_kwp: 180,
    today_kwh: 520, current_power_kw: 142, status: 'active', performance_ratio: 85, last_sync: '8 min ago',
  },
  {
    id: 's6', name: 'Hotel Radisson', platform: 'Huawei', capacity_kwp: 90,
    today_kwh: 295, current_power_kw: 55, status: 'maintenance', performance_ratio: 72, last_sync: '15 min ago',
  },
];

// Mock 7-day production data
const weeklyData = [
  { day: 'Mon', production: 1850, expected: 2100 },
  { day: 'Tue', production: 2250, expected: 2100 },
  { day: 'Wed', production: 1920, expected: 2100 },
  { day: 'Thu', production: 2380, expected: 2100 },
  { day: 'Fri', production: 2100, expected: 2100 },
  { day: 'Sat', production: 1680, expected: 2100 },
  { day: 'Sun', production: 2192, expected: 2100 },
];

const statusConfig: Record<MonitoringStatus, { icon: React.ReactNode; badge: 'success' | 'error' | 'warning'; label: string }> = {
  active: { icon: <Wifi className="w-3.5 h-3.5" />, badge: 'success', label: 'Online' },
  offline: { icon: <WifiOff className="w-3.5 h-3.5" />, badge: 'error', label: 'Offline' },
  maintenance: { icon: <AlertTriangle className="w-3.5 h-3.5" />, badge: 'warning', label: 'Maintenance' },
};

const totalCapacity = mockSites.reduce((a, s) => a + s.capacity_kwp, 0);
const totalToday = mockSites.reduce((a, s) => a + s.today_kwh, 0);
const avgPerformance = Math.round(
  mockSites.filter((s) => s.status === 'active').reduce((a, s) => a + s.performance_ratio, 0) /
    mockSites.filter((s) => s.status === 'active').length
);

const ChartTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string }>; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg bg-[#1a1a2e] border border-white/[0.1] px-3 py-2 shadow-lg">
        <p className="text-xs font-medium text-[#f0f0f5] mb-1">{label}</p>
        {payload.map((p) => (
          <p key={p.name} className="text-xs text-[#8888a0]">
            {p.name === 'production' ? 'Actual' : 'Expected'}: {p.value.toLocaleString()} kWh
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function MonitoringPage() {
  const { t } = useTranslation();

  return (
    <motion.div
      className="p-6 lg:p-8 max-w-[1400px] mx-auto"
      initial="initial"
      animate="animate"
      variants={{ animate: { transition: { staggerChildren: 0.06 } } }}
    >
      <motion.div variants={fadeUp}>
        <PageHeader
          title={t('monitoring.title')}
          description={t('monitoring.subtitle')}
          gradient
          actions={
            <Button variant="primary" icon={<RefreshCw className="w-4 h-4" />} size="sm">
              Sync All
            </Button>
          }
        />
      </motion.div>

      {/* Stats Row */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard
          label="Total Systems"
          value={mockSites.length}
          icon={<Sun className="w-4 h-4" />}
        />
        <StatsCard
          label="Total Capacity"
          value={totalCapacity}
          suffix=" kWp"
          icon={<Zap className="w-4 h-4" />}
        />
        <StatsCard
          label="Today's Production"
          value={totalToday}
          suffix=" kWh"
          icon={<BarChart3 className="w-4 h-4" />}
          trend={{ value: 8, label: 'vs yesterday' }}
        />
        <StatsCard
          label="Avg Performance"
          value={avgPerformance}
          suffix="%"
          icon={<Activity className="w-4 h-4" />}
          trend={{ value: 2, label: 'vs last week' }}
        />
      </motion.div>

      {/* Performance Chart */}
      <motion.div variants={fadeUp} className="mb-8">
        <GlassCard
          header={
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#f0f0f5]">7-Day Fleet Production</h2>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#00ffcc]" />
                  <span className="text-xs text-[#555566]">Actual</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#8b5cf6]" />
                  <span className="text-xs text-[#555566]">Expected</span>
                </div>
              </div>
            </div>
          }
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="productionGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00ffcc" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#00ffcc" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fill: '#555566', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#555566', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="production"
                  stroke="#00ffcc"
                  strokeWidth={2}
                  fill="url(#productionGrad)"
                />
                <Line
                  type="monotone"
                  dataKey="expected"
                  stroke="#8b5cf6"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </motion.div>

      {/* Site Cards Grid */}
      <motion.div variants={fadeUp}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-[#f0f0f5]">Monitored Systems</h2>
          <div className="flex items-center gap-3 text-xs text-[#555566]">
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" /> {mockSites.filter(s => s.status === 'active').length} Online</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#ef4444]" /> {mockSites.filter(s => s.status === 'offline').length} Offline</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" /> {mockSites.filter(s => s.status === 'maintenance').length} Maintenance</span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mockSites.map((site) => {
            const config = statusConfig[site.status];
            return (
              <GlassCard key={site.id} variant="interactive" padding="md">
                <div className="flex flex-col gap-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm font-semibold text-[#f0f0f5]">{site.name}</div>
                      <div className="text-xs text-[#555566]">{site.platform}</div>
                    </div>
                    <Badge variant={config.badge} dot size="sm">
                      {config.label}
                    </Badge>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-[#555566] mb-0.5">Capacity</div>
                      <div className="text-sm font-bold text-[#f0f0f5]">{site.capacity_kwp} kWp</div>
                    </div>
                    <div>
                      <div className="text-xs text-[#555566] mb-0.5">Current Power</div>
                      <div className={cn(
                        'text-sm font-bold',
                        site.status === 'active' ? 'text-[#00ffcc]' : 'text-[#555566]'
                      )}>
                        {site.current_power_kw} kW
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-[#555566] mb-0.5">Today</div>
                      <div className="text-sm font-bold text-[#f0f0f5]">{site.today_kwh.toLocaleString()} kWh</div>
                    </div>
                    <div>
                      <div className="text-xs text-[#555566] mb-0.5">Performance</div>
                      <div className={cn(
                        'text-sm font-bold',
                        site.performance_ratio >= 85 ? 'text-[#22c55e]' :
                        site.performance_ratio >= 70 ? 'text-[#f59e0b]' : 'text-[#ef4444]'
                      )}>
                        {site.performance_ratio}%
                      </div>
                    </div>
                  </div>

                  {/* Power bar */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-[#555566]">Output</span>
                      <span className="text-[10px] text-[#555566]">{Math.round((site.current_power_kw / site.capacity_kwp) * 100)}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          site.status === 'active' ? 'bg-[#00ffcc]' :
                          site.status === 'maintenance' ? 'bg-[#f59e0b]' : 'bg-[#ef4444]'
                        )}
                        style={{ width: `${Math.min(100, (site.current_power_kw / site.capacity_kwp) * 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between text-[10px] text-[#555566]">
                    <span>Last sync: {site.last_sync}</span>
                    <RefreshCw className="w-3 h-3 cursor-pointer hover:text-[#8888a0] transition-colors" />
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}
