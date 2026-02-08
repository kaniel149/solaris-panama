import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { ArrowLeft, Sun } from 'lucide-react';

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen w-full bg-[#0a0a0f] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
        {/* Glow */}
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.03, 0.06, 0.03],
          }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-[#00ffcc] blur-[150px]"
        />
        <motion.div
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.03, 0.05, 0.03],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="absolute bottom-1/3 left-1/3 w-[400px] h-[400px] rounded-full bg-[#8b5cf6] blur-[130px]"
        />

        {/* Floating particles */}
        {Array.from({ length: 12 }).map((_, i) => (
          <motion.div
            key={i}
            animate={{
              y: [0, -30, 0],
              x: [0, Math.sin(i) * 15, 0],
              opacity: [0.1, 0.3, 0.1],
            }}
            transition={{
              duration: 4 + (i % 3),
              repeat: Infinity,
              delay: i * 0.5,
              ease: 'easeInOut',
            }}
            className="absolute w-1 h-1 rounded-full bg-[#00ffcc]"
            style={{
              left: `${10 + (i * 7.5) % 80}%`,
              top: `${20 + (i * 13) % 60}%`,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative text-center"
      >
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="flex justify-center mb-8"
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#00ffcc]/20 to-[#8b5cf6]/20 border border-white/[0.08] flex items-center justify-center">
            <Sun className="w-6 h-6 text-[#00ffcc]/60" />
          </div>
        </motion.div>

        {/* 404 */}
        <motion.h1
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
          className="text-[120px] sm:text-[160px] font-black leading-none bg-gradient-to-r from-[#00ffcc] to-[#8b5cf6] bg-clip-text text-transparent select-none"
        >
          404
        </motion.h1>

        {/* Message */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
        >
          <h2 className="text-xl font-semibold text-white/80 mt-2">
            {t('notFound.title', 'Page not found')}
          </h2>
          <p className="text-sm text-white/30 mt-2 max-w-sm mx-auto">
            {t('notFound.subtitle', 'The page you are looking for does not exist or has been moved.')}
          </p>
        </motion.div>

        {/* Button */}
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/')}
          className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#00ffcc] to-[#00e6b8] text-[#0a0a0f] font-semibold text-sm hover:shadow-lg hover:shadow-[#00ffcc]/20 transition-shadow"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('notFound.goHome', 'Back to Dashboard')}
        </motion.button>

        {/* Solaris branding */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 text-xs text-white/10"
        >
          SOLARIS &middot; Panama Solar CRM
        </motion.p>
      </motion.div>
    </div>
  );
};

export default NotFoundPage;
