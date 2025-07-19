import React from 'react';
import CountryFlag from 'react-country-flag';
import type { NormalizedLocation } from '@/utils/locationUtils';
import { Globe } from 'lucide-react';

export type LocationBadgeVariant = 'inline' | 'card';

interface LocationBadgeProps {
  location: NormalizedLocation | null;
  variant?: LocationBadgeVariant;
  className?: string;
}

const cardStyle =
  'absolute right-3 top-[55%] z-20 flex items-center justify-center w-9 h-9 rounded-lg bg-white shadow-lg shadow-blue-300/40 border border-blue-200 text-xs font-semibold text-blue-700 backdrop-blur-md' +
  ' transform rotate-3 scale-105 hover:scale-110 transition-all duration-300';
const cardGlow =
  'before:content-[" "] before:absolute before:inset-0 before:rounded-lg before:bg-blue-400/20 before:blur-md before:opacity-70 before:-z-10';

const inlineStyle =
  'inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-medium text-blue-700 mr-1';

const LocationBadge: React.FC<LocationBadgeProps> = ({ location, variant = 'inline', className }) => {
  if (!location) return null;
  const { country, countryCode, city } = location;

  // Show globe if location is global
  const isGlobal = (
    (country && country.toLowerCase() === 'global') ||
    (city && city.toLowerCase() === 'global')
  );

  const badgeClass =
    variant === 'card'
      ? `${cardStyle} ${cardGlow} ${className || ''}`
      : `${inlineStyle} ${className || ''}`;

  if (variant === 'card') {
    return (
      <span className={badgeClass}>
        {isGlobal ? (
          <Globe className="w-5 h-5 drop-shadow" />
        ) : countryCode ? (
          <CountryFlag countryCode={countryCode} svg style={{ width: '1.6em', height: '1.6em', filter: 'drop-shadow(0 0 4px #60a5fa)' }} title={country} />
        ) : null}
      </span>
    );
  }

  // Inline variant (with text)
  if (isGlobal) {
    return (
      <span className={badgeClass}>
        <Globe className="w-4 h-4 drop-shadow" />
        Global
      </span>
    );
  }

  return (
    <span className={badgeClass}>
      {countryCode && (
        <CountryFlag countryCode={countryCode} svg style={{ width: '1.2em', height: '1.2em', filter: 'drop-shadow(0 0 4px #60a5fa)' }} title={country} />
      )}
      {city && !country ? city : country || city || 'Unknown'}
    </span>
  );
};

export default LocationBadge; 