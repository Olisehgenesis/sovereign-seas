// Flag color utilities for project and campaign cards

export interface FlagColorData {
  borderColor: string;
  description: string;
}

// Define flag colors for common countries
const flagColors: { [key: string]: FlagColorData } = {
  'US': { borderColor: 'border-red-300', description: 'USA - red' },
  'GB': { borderColor: 'border-blue-300', description: 'UK - blue' },
  'DE': { borderColor: 'border-yellow-300', description: 'Germany - yellow' },
  'FR': { borderColor: 'border-blue-300', description: 'France - blue' },
  'IT': { borderColor: 'border-green-300', description: 'Italy - green' },
  'ES': { borderColor: 'border-red-300', description: 'Spain - red' },
  'NL': { borderColor: 'border-orange-300', description: 'Netherlands - orange' },
  'CA': { borderColor: 'border-red-300', description: 'Canada - red' },
  'AU': { borderColor: 'border-blue-300', description: 'Australia - blue' },
  'JP': { borderColor: 'border-red-300', description: 'Japan - red' },
  'KR': { borderColor: 'border-blue-300', description: 'South Korea - blue' },
  'CN': { borderColor: 'border-red-300', description: 'China - red' },
  'IN': { borderColor: 'border-orange-300', description: 'India - orange' },
  'BR': { borderColor: 'border-green-300', description: 'Brazil - green' },
  'MX': { borderColor: 'border-green-300', description: 'Mexico - green' },
  'AR': { borderColor: 'border-blue-300', description: 'Argentina - blue' },
  'ZA': { borderColor: 'border-green-300', description: 'South Africa - green' },
  'NG': { borderColor: 'border-green-300', description: 'Nigeria - green' },
  'KE': { borderColor: 'border-red-300', description: 'Kenya - red' },
  'GH': { borderColor: 'border-red-300', description: 'Ghana - red' },
  'ET': { borderColor: 'border-green-300', description: 'Ethiopia - green' },
  'UG': { borderColor: 'border-yellow-300', description: 'Uganda - yellow' },
  'TZ': { borderColor: 'border-green-300', description: 'Tanzania - green' },
  'RW': { borderColor: 'border-blue-300', description: 'Rwanda - blue' },
  'BI': { borderColor: 'border-red-300', description: 'Burundi - red' },
  'SS': { borderColor: 'border-blue-300', description: 'South Sudan - blue' },
  'SD': { borderColor: 'border-green-300', description: 'Sudan - green' },
  'EG': { borderColor: 'border-red-300', description: 'Egypt - red' },
  'MA': { borderColor: 'border-red-300', description: 'Morocco - red' },
  'TN': { borderColor: 'border-red-300', description: 'Tunisia - red' },
  'DZ': { borderColor: 'border-green-300', description: 'Algeria - green' },
  'LY': { borderColor: 'border-green-300', description: 'Libya - green' },
  'TD': { borderColor: 'border-yellow-300', description: 'Chad - yellow' },
  'NE': { borderColor: 'border-orange-300', description: 'Niger - orange' },
  'ML': { borderColor: 'border-green-300', description: 'Mali - green' },
  'BF': { borderColor: 'border-red-300', description: 'Burkina Faso - red' },
  'CI': { borderColor: 'border-orange-300', description: 'Ivory Coast - orange' },
  'SN': { borderColor: 'border-green-300', description: 'Senegal - green' },
  'GN': { borderColor: 'border-red-300', description: 'Guinea - red' },
  'SL': { borderColor: 'border-green-300', description: 'Sierra Leone - green' },
  'LR': { borderColor: 'border-red-300', description: 'Liberia - red' },
  'TG': { borderColor: 'border-green-300', description: 'Togo - green' },
  'BJ': { borderColor: 'border-yellow-300', description: 'Benin - yellow' },
  'CM': { borderColor: 'border-green-300', description: 'Cameroon - green' },
  'CF': { borderColor: 'border-blue-300', description: 'Central African Republic - blue' },
  'CG': { borderColor: 'border-green-300', description: 'Republic of Congo - green' },
  'CD': { borderColor: 'border-blue-300', description: 'Democratic Republic of Congo - blue' },
  'GA': { borderColor: 'border-green-300', description: 'Gabon - green' },
  'GQ': { borderColor: 'border-green-300', description: 'Equatorial Guinea - green' },
  'ST': { borderColor: 'border-green-300', description: 'Sao Tome and Principe - green' },
  'AO': { borderColor: 'border-red-300', description: 'Angola - red' },
  'ZM': { borderColor: 'border-green-300', description: 'Zambia - green' },
  'ZW': { borderColor: 'border-green-300', description: 'Zimbabwe - green' },
  'BW': { borderColor: 'border-blue-300', description: 'Botswana - blue' },
  'NA': { borderColor: 'border-blue-300', description: 'Namibia - blue' },
  'LS': { borderColor: 'border-blue-300', description: 'Lesotho - blue' },
  'SZ': { borderColor: 'border-blue-300', description: 'Eswatini - blue' },
  'MG': { borderColor: 'border-red-300', description: 'Madagascar - red' },
  'MU': { borderColor: 'border-red-300', description: 'Mauritius - red' },
  'SC': { borderColor: 'border-blue-300', description: 'Seychelles - blue' },
  'KM': { borderColor: 'border-green-300', description: 'Comoros - green' },
  'DJ': { borderColor: 'border-blue-300', description: 'Djibouti - blue' },
  'SO': { borderColor: 'border-blue-300', description: 'Somalia - blue' },
  'ER': { borderColor: 'border-red-300', description: 'Eritrea - red' },
  'YE': { borderColor: 'border-red-300', description: 'Yemen - red' },
  'SA': { borderColor: 'border-green-300', description: 'Saudi Arabia - green' },
  'AE': { borderColor: 'border-red-300', description: 'UAE - red' },
  'QA': { borderColor: 'border-red-300', description: 'Qatar - red' },
  'KW': { borderColor: 'border-green-300', description: 'Kuwait - green' },
  'BH': { borderColor: 'border-red-300', description: 'Bahrain - red' },
  'OM': { borderColor: 'border-red-300', description: 'Oman - red' },
  'JO': { borderColor: 'border-red-300', description: 'Jordan - red' },
  'LB': { borderColor: 'border-red-300', description: 'Lebanon - red' },
  'SY': { borderColor: 'border-red-300', description: 'Syria - red' },
  'IQ': { borderColor: 'border-red-300', description: 'Iraq - red' },
  'IR': { borderColor: 'border-green-300', description: 'Iran - green' },
  'AF': { borderColor: 'border-red-300', description: 'Afghanistan - red' },
  'PK': { borderColor: 'border-green-300', description: 'Pakistan - green' },
  'BD': { borderColor: 'border-green-300', description: 'Bangladesh - green' },
  'LK': { borderColor: 'border-orange-300', description: 'Sri Lanka - orange' },
  'MV': { borderColor: 'border-red-300', description: 'Maldives - red' },
  'NP': { borderColor: 'border-red-300', description: 'Nepal - red' },
  'BT': { borderColor: 'border-orange-300', description: 'Bhutan - orange' },
  'MM': { borderColor: 'border-yellow-300', description: 'Myanmar - yellow' },
  'TH': { borderColor: 'border-red-300', description: 'Thailand - red' },
  'LA': { borderColor: 'border-red-300', description: 'Laos - red' },
  'KH': { borderColor: 'border-red-300', description: 'Cambodia - red' },
  'VN': { borderColor: 'border-red-300', description: 'Vietnam - red' },
  'MY': { borderColor: 'border-blue-300', description: 'Malaysia - blue' },
  'SG': { borderColor: 'border-red-300', description: 'Singapore - red' },
  'ID': { borderColor: 'border-red-300', description: 'Indonesia - red' },
  'PH': { borderColor: 'border-red-300', description: 'Philippines - red' },
  'TL': { borderColor: 'border-red-300', description: 'Timor-Leste - red' },
  'BN': { borderColor: 'border-yellow-300', description: 'Brunei - yellow' },
  'PG': { borderColor: 'border-red-300', description: 'Papua New Guinea - red' },
  'FJ': { borderColor: 'border-blue-300', description: 'Fiji - blue' },
  'NC': { borderColor: 'border-red-300', description: 'New Caledonia - red' },
  'VU': { borderColor: 'border-red-300', description: 'Vanuatu - red' },
  'SB': { borderColor: 'border-blue-300', description: 'Solomon Islands - blue' },
  'TO': { borderColor: 'border-red-300', description: 'Tonga - red' },
  'WS': { borderColor: 'border-red-300', description: 'Samoa - red' },
  'KI': { borderColor: 'border-red-300', description: 'Kiribati - red' },
  'TV': { borderColor: 'border-blue-300', description: 'Tuvalu - blue' },
  'NR': { borderColor: 'border-blue-300', description: 'Nauru - blue' },
  'PW': { borderColor: 'border-blue-300', description: 'Palau - blue' },
  'MH': { borderColor: 'border-blue-300', description: 'Marshall Islands - blue' },
  'FM': { borderColor: 'border-blue-300', description: 'Micronesia - blue' },
  'CK': { borderColor: 'border-blue-300', description: 'Cook Islands - blue' },
  'NU': { borderColor: 'border-yellow-300', description: 'Niue - yellow' },
  'TK': { borderColor: 'border-red-300', description: 'Tokelau - red' },
  'AS': { borderColor: 'border-blue-300', description: 'American Samoa - blue' },
  'GU': { borderColor: 'border-blue-300', description: 'Guam - blue' },
  'MP': { borderColor: 'border-blue-300', description: 'Northern Mariana Islands - blue' },
};

/**
 * Get flag border color for a given location
 * @param location - Normalized location object
 * @returns Tailwind CSS border color class
 */
export function getFlagBorderColor(location: any): string {
  if (!location) return 'border-blue-200';
  
  const { countryCode } = location;
  
  return flagColors[countryCode]?.borderColor || 'border-blue-200';
}

/**
 * Get flag color data for a given country code
 * @param countryCode - ISO 3166-1 alpha-2 country code
 * @returns FlagColorData object or null if not found
 */
export function getFlagColorData(countryCode: string): FlagColorData | null {
  return flagColors[countryCode] || null;
}

/**
 * Get all available flag colors
 * @returns Object with all flag color mappings
 */
export function getAllFlagColors(): { [key: string]: FlagColorData } {
  return { ...flagColors };
}

/**
 * Check if a country code has a defined flag color
 * @param countryCode - ISO 3166-1 alpha-2 country code
 * @returns boolean indicating if flag color is defined
 */
export function hasFlagColor(countryCode: string): boolean {
  return countryCode in flagColors;
} 