import type { Variants } from 'framer-motion';

export const pageTransition: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.2, ease: 'easeIn' } },
};

export const listItemSlide: Variants = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
};

export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.2, ease: 'easeOut' } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } },
};

export const slideUp: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
  exit: { opacity: 0, y: 20, transition: { duration: 0.2 } },
};

export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
};

export const navItemVariants: Variants = {
  inactive: {
    backgroundColor: 'transparent',
    color: '#8888a0',
    transition: { duration: 0.2 },
  },
  active: {
    backgroundColor: 'rgba(0, 255, 204, 0.1)',
    color: '#00ffcc',
    transition: { duration: 0.2 },
  },
};

export const cardHover: Variants = {
  rest: {
    scale: 1,
    boxShadow: '0 4px 30px rgba(0, 0, 0, 0.3)',
    transition: { duration: 0.2 },
  },
  hover: {
    scale: 1.01,
    boxShadow: '0 8px 40px rgba(0, 0, 0, 0.4)',
    transition: { duration: 0.2 },
  },
};

export const glassHover: Variants = {
  rest: {
    scale: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    transition: { duration: 0.2 },
  },
  hover: {
    scale: 1.02,
    borderColor: 'rgba(0, 255, 204, 0.2)',
    boxShadow: '0 0 20px rgba(0, 255, 204, 0.1)',
    transition: { duration: 0.2 },
  },
};

export const neonPulse: Variants = {
  initial: {
    boxShadow: '0 0 0px rgba(0, 255, 204, 0)',
  },
  animate: {
    boxShadow: [
      '0 0 5px rgba(0, 255, 204, 0.1)',
      '0 0 20px rgba(0, 255, 204, 0.2)',
      '0 0 5px rgba(0, 255, 204, 0.1)',
    ],
    transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
  },
};

export const tableRowHover = {
  backgroundColor: 'rgba(255, 255, 255, 0.03)',
  transition: { duration: 0.15 },
};

export const kanbanCardDrag: Variants = {
  idle: {
    scale: 1,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
    rotate: 0,
  },
  dragging: {
    scale: 1.05,
    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.4)',
    rotate: 2,
    transition: { duration: 0.2 },
  },
};

export const modalOverlay: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

export const modalContent: Variants = {
  initial: { opacity: 0, scale: 0.95, y: 10 },
  animate: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
  exit: { opacity: 0, scale: 0.95, y: 10, transition: { duration: 0.15 } },
};

export const sidebarVariants: Variants = {
  expanded: { width: 256, transition: { duration: 0.3, ease: 'easeInOut' } },
  collapsed: { width: 72, transition: { duration: 0.3, ease: 'easeInOut' } },
};

export const tooltipVariants: Variants = {
  initial: { opacity: 0, scale: 0.9, y: 4 },
  animate: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.15 } },
  exit: { opacity: 0, scale: 0.9, y: 4, transition: { duration: 0.1 } },
};
