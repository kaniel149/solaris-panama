import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

/**
 * SectionHeader — premium marketing section heading ported from bustan-energy.
 * Uses the additive `bustan-*` theme tokens (lagoon kicker + Instrument Serif
 * display title). Marketing site only.
 */

type Props = {
  /** Small uppercase kicker, lagoon color. */
  tag?: string;
  /** Display title (Instrument Serif via .font-display). */
  title: string;
  subtitle?: ReactNode;
  align?: 'center' | 'left';
  className?: string;
};

export function SectionHeader({ tag, title, subtitle, align = 'center', className = '' }: Props) {
  const alignCls = align === 'center' ? 'text-center mx-auto' : 'text-left';
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={`max-w-2xl ${alignCls} ${className}`}
    >
      {tag && (
        <p className="text-xs font-semibold tracking-[0.2em] uppercase text-bustan-lagoon mb-3">
          {tag}
        </p>
      )}
      <h2 className="font-display text-display-md leading-[1.1] text-ink md:text-display-lg">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-4 text-lg leading-relaxed text-ink/[0.74]">{subtitle}</p>
      )}
    </motion.div>
  );
}

export default SectionHeader;
