'use client';

import Image from 'next/image';
import { ipfsImageLoader } from '@/utils/imageUtils';

interface ProjectLogoProps {
  logo?: string;
  name: string;
  verified?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function ProjectLogo({ logo, name, size = 'md' }: ProjectLogoProps) {
  const sizeClasses = {
    sm: { container: 'w-12 h-12', text: 'text-lg', size: 48 },
    md: { container: 'w-20 h-20', text: 'text-2xl', size: 80 },
    lg: { container: 'w-32 h-32', text: 'text-4xl', size: 128 }
  };

  const sizeConfig = sizeClasses[size];

  return (
    <div className="relative">
      {logo ? (
        <div className={`${sizeConfig.container} relative rounded-full overflow-hidden border-[0.2em] border-[#050505]`}>
          <Image
            loader={ipfsImageLoader}
            src={logo}
            alt={`${name} logo`}
            fill
            className="rounded-full object-cover"
            sizes={`${sizeConfig.size}px`}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const fallback = target.parentElement?.nextSibling as HTMLElement;
              if (fallback) fallback.style.display = 'flex';
            }}
          />
        </div>
      ) : null}
      <div className={`${sizeConfig.container} ${sizeConfig.text} bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-extrabold border-[0.2em] border-[#050505] ${logo ? 'hidden' : 'flex'}`}>
        {name?.charAt(0) || 'P'}
      </div>
    </div>
  );
}

