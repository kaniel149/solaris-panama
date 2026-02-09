import { motion } from 'framer-motion';

interface ConfidenceScoreProps {
  score: number; // 0-100
  sourcesWithData: number;
  totalSources: number;
  size?: 'sm' | 'md' | 'lg';
}

function getConfidenceColor(score: number): string {
  if (score >= 70) return '#10b981';
  if (score >= 50) return '#f59e0b';
  if (score >= 30) return '#f97316';
  return '#ef4444';
}

function getConfidenceLabel(score: number): string {
  if (score >= 70) return 'HIGH';
  if (score >= 50) return 'MEDIUM';
  if (score >= 30) return 'LOW';
  return 'VERY LOW';
}

const sizeConfig = {
  sm: { svgSize: 56, radius: 22, strokeWidth: 4, fontSize: 'text-sm', labelSize: 'text-[8px]' },
  md: { svgSize: 72, radius: 28, strokeWidth: 5, fontSize: 'text-lg', labelSize: 'text-[9px]' },
  lg: { svgSize: 88, radius: 34, strokeWidth: 6, fontSize: 'text-xl', labelSize: 'text-[10px]' },
};

export function ConfidenceScore({
  score,
  sourcesWithData,
  totalSources,
  size = 'md',
}: ConfidenceScoreProps) {
  const color = getConfidenceColor(score);
  const label = getConfidenceLabel(score);
  const { svgSize, radius, strokeWidth, fontSize, labelSize } = sizeConfig[size];
  const circumference = 2 * Math.PI * radius;
  const dashoffset = circumference * (1 - score / 100);

  return (
    <div className="flex items-center gap-3">
      {/* SVG Ring */}
      <div className="relative shrink-0" style={{ width: svgSize, height: svgSize }}>
        <svg width={svgSize} height={svgSize} className="-rotate-90">
          {/* Background track */}
          <circle
            cx={svgSize / 2}
            cy={svgSize / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={strokeWidth}
          />
          {/* Progress arc */}
          <motion.circle
            cx={svgSize / 2}
            cy={svgSize / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: dashoffset }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </svg>
        {/* Center number */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`${fontSize} font-bold`} style={{ color }}>
            {score}
          </span>
        </div>
      </div>

      {/* Labels */}
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-[#f0f0f5]">Confidence</span>
          <span
            className={`${labelSize} font-bold px-1.5 py-0.5 rounded`}
            style={{ backgroundColor: `${color}15`, color }}
          >
            {label}
          </span>
        </div>
        <span className="text-[10px] text-[#555566] mt-0.5 block">
          {sourcesWithData}/{totalSources} sources returned data
        </span>
      </div>
    </div>
  );
}
