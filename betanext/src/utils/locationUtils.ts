import Fuse from 'fuse.js';
import { getNames, getCode } from 'country-list';

// List of countries and cities (for demo, only countries; cities can be extended)
const countries = getNames();
const countryFuse = new Fuse(countries, { threshold: 0.3 });

// Optionally, you can add a list of major cities for fuzzy matching
const cities: string[] = [
  // Add major cities here if needed
];
const cityFuse = new Fuse(cities, { threshold: 0.3 });

export interface NormalizedLocation {
  country?: string; // Full country name
  countryCode?: string; // ISO 3166-1 alpha-2
  city?: string;
  rawCountry?: string;
  rawCity?: string;
  matchType: 'country' | 'city' | 'unknown';
}

/**
 * Extract and normalize location from project metadata (handles typos and city-only cases)
 */
export function getNormalizedLocation(metadata: any): NormalizedLocation | null {
  if (!metadata) return null;
  let country = metadata.country || metadata.Country || '';
  let city = metadata.city || metadata.City || '';

  // Sometimes country/city are in a single field
  if (!country && metadata.location) {
    // Try to split by comma or dash
    const parts = metadata.location.split(/,|-/).map((s: string) => s.trim());
    if (parts.length === 2) {
      city = city || parts[0];
      country = country || parts[1];
    } else if (parts.length === 1) {
      // Could be just a country or city
      country = country || parts[0];
    }
  }

  // If any field is 'global', treat as global
  const isGlobal = [country, city, metadata.location]
    .filter(Boolean)
    .some(val => typeof val === 'string' && val.trim().toLowerCase() === 'global');
  if (isGlobal) {
    return {
      country: 'global',
      countryCode: undefined,
      city: undefined,
      rawCountry: country || undefined,
      rawCity: city || undefined,
      matchType: 'country',
    };
  }

  // Fuzzy match country
  let normalizedCountry = '';
  let countryCode = '';
  let matchType: NormalizedLocation['matchType'] = 'unknown';
  if (country) {
    const result = countryFuse.search(country);
    if (result.length > 0) {
      normalizedCountry = result[0].item;
      countryCode = getCode(normalizedCountry) || '';
      matchType = 'country';
    }
  }

  // If no country, try to fuzzy match city (optional, extend cities list)
  let normalizedCity = '';
  if (!normalizedCountry && city) {
    const result = cityFuse.search(city);
    if (result.length > 0) {
      normalizedCity = result[0].item;
      matchType = 'city';
    }
  }

  return {
    country: normalizedCountry || undefined,
    countryCode: countryCode || undefined,
    city: normalizedCity || (city || undefined),
    rawCountry: country || undefined,
    rawCity: city || undefined,
    matchType,
  };
} 