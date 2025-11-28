'use client';

import { TrendingUp } from 'lucide-react';

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number | React.ReactNode;
  color?: string;
  trend?: number | null;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
}

export const StatCard = ({ icon: Icon, label, value, color = 'blue', trend = null, onClick }: StatCardProps) => {
  const colorMap: Record<string, { bg: string; border: string; icon: string; text: string }> = {
    blue: { bg: '#dbeafe', border: '#2563eb', icon: '#2563eb', text: '#050505' },
    purple: { bg: '#f3e8ff', border: '#a855f7', icon: '#a855f7', text: '#050505' },
    green: { bg: '#d1fae5', border: '#10b981', icon: '#10b981', text: '#050505' },
    amber: { bg: '#fef3c7', border: '#f59e0b', icon: '#f59e0b', text: '#050505' },
    yellow: { bg: '#fef3c7', border: '#f59e0b', icon: '#f59e0b', text: '#050505' }
  };
  
  const colors = colorMap[color] || colorMap.blue;
  
  return (
    <div 
      className="group relative w-full"
      onClick={onClick}
    >
      <div 
        className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-50 transition-opacity duration-[400ms] z-[1]"
        style={{
          backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
          backgroundSize: '0.5em 0.5em'
        }}
      />
      
      <div 
        className={`relative bg-white border-[0.3em] rounded-[0.5em] shadow-[0.5em_0.5em_0_#000000] transition-all duration-[400ms] overflow-hidden z-[2] ${onClick ? 'cursor-pointer' : ''} group-hover:shadow-[0.6em_0.6em_0_#000000] group-hover:-translate-x-[0.2em] group-hover:-translate-y-[0.2em]`}
        style={{ 
          borderColor: colors.border,
          boxShadow: 'inset 0 0 0 0.1em rgba(0, 0, 0, 0.05)'
        }}
      >
        <div className="absolute -top-[0.8em] -right-[0.8em] w-[3em] h-[3em] rotate-45 z-[1]" style={{ backgroundColor: colors.border }} />
        <div className="absolute top-[0.3em] right-[0.3em] text-white text-[1em] font-bold z-[2]">★</div>
        
        <div className="relative px-4 py-3 z-[2]">
          <div className="flex items-center justify-between mb-2">
            <div 
              className="w-10 h-10 rounded-[0.3em] flex items-center justify-center border-[0.15em]"
              style={{ backgroundColor: colors.bg, borderColor: colors.border }}
            >
              <Icon className="h-5 w-5" style={{ color: colors.icon }} />
            </div>
            {trend && (
              <div 
                className={`flex items-center gap-1 text-xs font-bold ${trend > 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}
              >
                <TrendingUp className="h-3 w-3" />
                <span>{Math.abs(trend)}%</span>
              </div>
            )}
          </div>
          <p className="text-2xl font-extrabold mb-1" style={{ color: colors.text }}>
            {value}
          </p>
          <p className="text-xs font-bold uppercase tracking-[0.05em]" style={{ color: colors.text }}>{label}</p>
        </div>
      </div>
    </div>
  );
};

