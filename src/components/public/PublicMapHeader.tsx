import { Sun, Building2 } from 'lucide-react';

interface PublicMapHeaderProps {
  buildingCount: number;
}

export default function PublicMapHeader({ buildingCount }: PublicMapHeaderProps) {
  return (
    <header className="absolute top-0 left-0 right-0 z-20 h-14 flex items-center justify-between px-4 md:px-6 backdrop-blur-xl bg-[#0a0a0f]/80 border-b border-white/[0.06]">
      {/* Left: Brand + Title */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#00ffcc]/10">
          <Sun className="w-4.5 h-4.5 text-[#00ffcc]" />
        </div>
        <div className="min-w-0">
          <h1 className="text-sm font-semibold text-[#f0f0f5] truncate">
            <span className="hidden sm:inline">Mapa Solar de Panam&aacute;</span>
            <span className="sm:hidden">Mapa Solar</span>
          </h1>
          <p className="text-[10px] text-[#8888a0] hidden md:block">
            Descubre el potencial solar de tu edificio
          </p>
        </div>
      </div>

      {/* Right: Building counter */}
      {buildingCount > 0 && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06]">
          <Building2 className="w-3.5 h-3.5 text-[#8888a0]" />
          <span className="text-xs font-medium text-[#f0f0f5]">
            {buildingCount} edificio{buildingCount !== 1 ? 's' : ''}
          </span>
        </div>
      )}
    </header>
  );
}
