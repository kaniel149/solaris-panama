import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { motion } from 'framer-motion';
import {
  Phone,
  Mail,
  Users,
  StickyNote,
  ArrowRightLeft,
  FileText,
  CheckCircle2,
  XCircle,
  ClipboardList,
  ShieldCheck,
  Wrench,
  PackageCheck,
  Upload,
  MapPin,
  DollarSign,
} from 'lucide-react';
import type { Activity, ActivityType } from '../../types/activity';

function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

const ACTIVITY_ICONS: Record<ActivityType, React.ElementType> = {
  call: Phone,
  email: Mail,
  meeting: Users,
  note: StickyNote,
  stage_change: ArrowRightLeft,
  proposal_sent: FileText,
  proposal_accepted: CheckCircle2,
  proposal_rejected: XCircle,
  permit_submitted: ClipboardList,
  permit_approved: ShieldCheck,
  installation_started: Wrench,
  installation_completed: PackageCheck,
  document_uploaded: Upload,
  site_visit: MapPin,
  payment_received: DollarSign,
};

const ACTIVITY_COLORS: Record<ActivityType, string> = {
  call: 'text-blue-400 bg-blue-400/10',
  email: 'text-purple-400 bg-purple-400/10',
  meeting: 'text-amber-400 bg-amber-400/10',
  note: 'text-slate-400 bg-slate-400/10',
  stage_change: 'text-cyan-400 bg-cyan-400/10',
  proposal_sent: 'text-indigo-400 bg-indigo-400/10',
  proposal_accepted: 'text-emerald-400 bg-emerald-400/10',
  proposal_rejected: 'text-red-400 bg-red-400/10',
  permit_submitted: 'text-orange-400 bg-orange-400/10',
  permit_approved: 'text-green-400 bg-green-400/10',
  installation_started: 'text-teal-400 bg-teal-400/10',
  installation_completed: 'text-emerald-400 bg-emerald-400/10',
  document_uploaded: 'text-sky-400 bg-sky-400/10',
  site_visit: 'text-pink-400 bg-pink-400/10',
  payment_received: 'text-yellow-400 bg-yellow-400/10',
};

interface ActivityFeedProps {
  activities: Activity[];
  className?: string;
}

export function ActivityFeed({ activities, className }: ActivityFeedProps) {
  const { i18n } = useTranslation();
  const locale = i18n.language === 'es' ? es : enUS;

  if (activities.length === 0) {
    return (
      <div className={cn('text-center py-8 text-slate-500', className)}>
        No activities yet
      </div>
    );
  }

  return (
    <div className={cn('space-y-1', className)}>
      {activities.map((activity, index) => {
        const Icon = ACTIVITY_ICONS[activity.type] ?? StickyNote;
        const colorClass = ACTIVITY_COLORS[activity.type] ?? 'text-slate-400 bg-slate-400/10';

        return (
          <motion.div
            key={activity.id}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.04, duration: 0.25 }}
            className="flex items-start gap-3 py-3 px-2 rounded-lg hover:bg-white/5 transition-colors"
          >
            <div className={cn('p-2 rounded-lg shrink-0', colorClass)}>
              <Icon className="w-4 h-4" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {activity.user && (
                  <span className="text-sm font-medium text-white">
                    {activity.user.full_name}
                  </span>
                )}
                <span className="text-sm text-slate-300">{activity.title}</span>
              </div>
              {activity.description && (
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                  {activity.description}
                </p>
              )}
            </div>

            <time className="text-xs text-slate-500 shrink-0 whitespace-nowrap">
              {formatDistanceToNow(new Date(activity.created_at), {
                addSuffix: true,
                locale,
              })}
            </time>
          </motion.div>
        );
      })}
    </div>
  );
}
