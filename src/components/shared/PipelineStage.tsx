import { useTranslation } from 'react-i18next';
import type { PipelineStage as PipelineStageType } from '../../types/project';
import { STAGE_LABELS, STAGE_COLORS } from '../../types/project';

function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

interface PipelineStageBadgeProps {
  stage: PipelineStageType;
  size?: 'sm' | 'md';
  count?: number;
  className?: string;
}

export function PipelineStageBadge({ stage, size = 'md', count, className }: PipelineStageBadgeProps) {
  const { i18n } = useTranslation();
  const lang = i18n.language === 'es' ? 'es' : 'en';
  const label = STAGE_LABELS[stage]?.[lang] ?? stage;
  const color = STAGE_COLORS[stage] ?? '#6b7280';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        className,
      )}
      style={{
        backgroundColor: `${color}18`,
        color,
        border: `1px solid ${color}30`,
      }}
    >
      <span
        className="shrink-0 rounded-full"
        style={{
          width: size === 'sm' ? 6 : 8,
          height: size === 'sm' ? 6 : 8,
          backgroundColor: color,
        }}
      />
      {label}
      {count !== undefined && (
        <span
          className="ml-1 rounded-full px-1.5 text-xs font-bold"
          style={{ backgroundColor: `${color}25`, color }}
        >
          {count}
        </span>
      )}
    </span>
  );
}
