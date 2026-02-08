import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';

function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

interface LanguageToggleProps {
  className?: string;
}

export function LanguageToggle({ className }: LanguageToggleProps) {
  const { i18n } = useTranslation();
  const isEnglish = i18n.language === 'en';

  function toggle() {
    i18n.changeLanguage(isEnglish ? 'es' : 'en');
  }

  return (
    <button
      onClick={toggle}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium',
        'bg-white/5 border border-white/10 text-slate-300',
        'hover:bg-white/10 hover:text-white transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-solaris-blue/50',
        className,
      )}
      title={isEnglish ? 'Cambiar a Espanol' : 'Switch to English'}
    >
      <Languages className="w-4 h-4" />
      <span className="uppercase tracking-wide">{isEnglish ? 'EN' : 'ES'}</span>
    </button>
  );
}
