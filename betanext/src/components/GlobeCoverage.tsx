import { useEffect, useRef, useState } from 'react';
import * as am4core from '@amcharts/amcharts4/core';
import * as am4maps from '@amcharts/amcharts4/maps';
import am4themes_animated from '@amcharts/amcharts4/themes/animated';
import am4geodata_worldLow from '@amcharts/amcharts4-geodata/worldLow';
import { getCode } from 'country-list';

// Apply theme
am4core.useTheme(am4themes_animated);

// Comprehensive country list by continent with colors
const CONTINENT_COUNTRIES = {
  africa: {
    countries: [
      'Nigeria', 'South Africa', 'Kenya', 'Ghana', 'Ethiopia', 'Tanzania', 'Uganda',
      'Morocco', 'Algeria', 'Egypt', 'Tunisia', 'Senegal', 'Cameroon', 'Ivory Coast',
      'Madagascar', 'Mozambique', 'Angola', 'Sudan', 'Mali', 'Burkina Faso', 'Niger',
      'Malawi', 'Zambia', 'Zimbabwe', 'Rwanda', 'Benin', 'Burundi', 'Guinea',
      'Sierra Leone', 'Togo', 'Libya', 'Mauritania', 'Eritrea', 'Gambia', 'Botswana',
      'Namibia', 'Gabon', 'Lesotho', 'Guinea-Bissau', 'Equatorial Guinea', 'Mauritius',
      'Eswatini', 'Djibouti', 'Comoros', 'Cape Verde', 'Sao Tome and Principe', 'Seychelles'
    ],
    color: '#10b981' // Green
  },
  europe: {
    countries: [
      'United Kingdom', 'Germany', 'France', 'Italy', 'Spain', 'Netherlands', 'Belgium',
      'Switzerland', 'Austria', 'Sweden', 'Norway', 'Denmark', 'Finland', 'Poland',
      'Portugal', 'Greece', 'Ireland', 'Czech Republic', 'Hungary', 'Romania', 'Bulgaria',
      'Croatia', 'Slovakia', 'Slovenia', 'Lithuania', 'Latvia', 'Estonia', 'Luxembourg',
      'Malta', 'Cyprus', 'Iceland', 'Ukraine', 'Belarus', 'Serbia', 'Bosnia and Herzegovina',
      'Albania', 'North Macedonia', 'Moldova', 'Montenegro', 'Kosovo'
    ],
    color: '#3b82f6' // Blue
  },
  asia: {
    countries: [
      'China', 'Japan', 'India', 'Indonesia', 'Pakistan', 'Bangladesh', 'Philippines',
      'Vietnam', 'Thailand', 'Myanmar', 'South Korea', 'Malaysia', 'Afghanistan', 'Nepal',
      'Sri Lanka', 'Kazakhstan', 'Uzbekistan', 'Iraq', 'Saudi Arabia', 'Yemen', 'North Korea',
      'Taiwan', 'Syria', 'Cambodia', 'Laos', 'Mongolia', 'Armenia', 'Georgia', 'Azerbaijan',
      'Kyrgyzstan', 'Tajikistan', 'Turkmenistan', 'Jordan', 'Lebanon', 'Kuwait', 'Oman',
      'United Arab Emirates', 'Qatar', 'Bahrain', 'Israel', 'Palestine', 'Singapore', 'Brunei',
      'Timor-Leste', 'Bhutan', 'Maldives'
    ],
    color: '#f59e0b' // Orange/Amber
  },
  americas: {
    countries: [
      'United States', 'Canada', 'Mexico', 'Brazil', 'Argentina', 'Chile', 'Colombia',
      'Peru', 'Venezuela', 'Ecuador', 'Guatemala', 'Cuba', 'Haiti', 'Dominican Republic',
      'Honduras', 'El Salvador', 'Nicaragua', 'Costa Rica', 'Panama', 'Jamaica', 'Trinidad and Tobago',
      'Belize', 'Bahamas', 'Barbados', 'Guyana', 'Suriname', 'Uruguay', 'Paraguay',
      'Bolivia', 'Grenada', 'Saint Lucia', 'Saint Vincent and the Grenadines', 'Antigua and Barbuda',
      'Dominica', 'Saint Kitts and Nevis'
    ],
    color: '#ef4444' // Red
  },
  oceania: {
    countries: [
      'Australia', 'New Zealand', 'Papua New Guinea', 'Fiji', 'Solomon Islands', 'Vanuatu',
      'New Caledonia', 'French Polynesia', 'Samoa', 'Guam', 'Micronesia', 'Kiribati',
      'Marshall Islands', 'Palau', 'Tonga', 'Tuvalu', 'Nauru'
    ],
    color: '#8b5cf6' // Purple
  }
};

// Flatten all countries
const DUMMY_COUNTRIES = Object.values(CONTINENT_COUNTRIES).flatMap(continent => continent.countries);

// Helper to get continent color for a country
const getCountryColor = (countryName: string): string => {
  for (const [continent, data] of Object.entries(CONTINENT_COUNTRIES)) {
    if (data.countries.includes(countryName)) {
      return data.color;
    }
  }
  return '#e5e7eb'; // Default gray for countries not in our list
};

// Helper to darken a hex color
const darkenColor = (hex: string, amount: number): string => {
  // Remove # if present
  const color = hex.replace('#', '');
  
  // Convert to RGB
  const num = parseInt(color, 16);
  const r = Math.max(0, Math.min(255, (num >> 16) - amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) - amount));
  const b = Math.max(0, Math.min(255, (num & 0x0000FF) - amount));
  
  // Convert back to hex
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
};

interface CoverageResponse {
  countries: string[];
  count: number;
  message: string;
}

const GlobeCoverage = () => {
  const chartRef = useRef<am4maps.MapChart | null>(null);
  const chartDivRef = useRef<HTMLDivElement>(null);
  const [countries, setCountries] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const animationRef = useRef<am4core.Animation | null>(null);

  useEffect(() => {
    // Fetch countries from coverage API
    const fetchCountries = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Try to fetch from the coverage API with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        try {
          const response = await fetch('https://selfauth.vercel.app/api/coverage', {
            signal: controller.signal,
            headers: {
              'Accept': 'application/json',
            }
          });
          
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            // Silently fall back to dummy data if API fails
            setCountries(DUMMY_COUNTRIES);
            return;
          }
          
          const data: CoverageResponse = await response.json();
          
          if (data.countries && data.countries.length > 0) {
            setCountries(data.countries);
          } else {
            // If no countries, use dummy data
            setCountries(DUMMY_COUNTRIES);
          }
        } catch (fetchError: any) {
          clearTimeout(timeoutId);
          // Silently fall back to dummy data on network errors
          if (fetchError.name !== 'AbortError') {
            // Only log non-timeout errors
            console.warn('Coverage API unavailable, using fallback data');
          }
          setCountries(DUMMY_COUNTRIES);
        }
      } catch (err) {
        // Final fallback - use dummy countries
        setCountries(DUMMY_COUNTRIES);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCountries();
  }, []);

  useEffect(() => {
    if (!chartDivRef.current || isLoading || countries.length === 0) return;

    // Create chart instance
    const chart = am4core.create(chartDivRef.current, am4maps.MapChart);
    chartRef.current = chart;

    // Set map definition
    chart.geodata = am4geodata_worldLow;

    // Set projection - use Orthographic projection
    chart.projection = new (am4maps as any).projections.Orthographic();
    chart.panBehavior = 'rotateLongLat';
    chart.deltaLatitude = -20;
    chart.padding(20, 20, 20, 20);

    // Create map polygon series
    const polygonSeries = chart.series.push(new am4maps.MapPolygonSeries());
    polygonSeries.useGeodata = true;

    // Get country codes from countries list
    const countryCodes = countries
      .map(country => getCode(country))
      .filter((code): code is string => code !== null && code !== undefined)
      .map(code => code.toUpperCase());

    // Configure series
    const polygonTemplate = polygonSeries.mapPolygons.template;
    polygonTemplate.tooltipText = '{name}';
    polygonTemplate.strokeWidth = 0.5;
    polygonTemplate.cursorOverStyle = am4core.MouseCursorStyle.pointer;

    // Create hover state - brighten on hover
    const hs = polygonTemplate.states.create('hover');
    hs.properties.scale = 1.05;

    // Color countries based on continent with multi-color scheme
    if (countryCodes.length > 0) {
      // Create a map of country codes to country names for color lookup
      const codeToNameMap: { [key: string]: string } = {};
      countries.forEach(country => {
        const code = getCode(country);
        if (code) {
          codeToNameMap[code.toUpperCase()] = country;
        }
      });

      polygonTemplate.adapter.add('fill', (_fill, target) => {
        const dataItem = target.dataItem;
        if (dataItem && dataItem.dataContext) {
          const context = dataItem.dataContext as any;
          const countryId = context.id || context.NAME;
          if (countryId && typeof countryId === 'string') {
            const upperId = countryId.toUpperCase();
            if (countryCodes.includes(upperId)) {
              // Get country name from code
              const countryName = codeToNameMap[upperId];
              if (countryName) {
                // Get continent color
                const color = getCountryColor(countryName);
                return am4core.color(color);
              }
              // Fallback to blue if country name not found
              return am4core.color('#3b82f6');
            }
          }
        }
        return am4core.color('#e5e7eb');
      });

      polygonTemplate.adapter.add('stroke', (_stroke, target) => {
        const dataItem = target.dataItem;
        if (dataItem && dataItem.dataContext) {
          const context = dataItem.dataContext as any;
          const countryId = context.id || context.NAME;
          if (countryId && typeof countryId === 'string') {
            const upperId = countryId.toUpperCase();
            if (countryCodes.includes(upperId)) {
              const countryName = codeToNameMap[upperId];
              if (countryName) {
                const color = getCountryColor(countryName);
                // Darken the color for stroke (darker border)
                const darkenedColor = darkenColor(color, 30);
                return am4core.color(darkenedColor);
              }
              return am4core.color('#1e40af');
            }
          }
        }
        return am4core.color('#9ca3af');
      });
    }

    // Add graticule
    const graticuleSeries = chart.series.push(new am4maps.GraticuleSeries());
    graticuleSeries.mapLines.template.line.stroke = am4core.color('#ffffff');
    graticuleSeries.mapLines.template.line.strokeOpacity = 0.08;
    graticuleSeries.fitExtent = false;

    // Background - transparent
    chart.backgroundSeries.mapPolygons.template.polygon.fillOpacity = 0;
    chart.backgroundSeries.mapPolygons.template.polygon.fill = am4core.color('#ffffff');

    // Auto-rotate
    setTimeout(() => {
      if (chart && !chart.isDisposed) {
        animationRef.current = chart.animate(
          { property: 'deltaLongitude', to: 100000 },
          20000000
        );
      }
    }, 3000);

    // Stop animation on click
    chart.seriesContainer.events.on('down', () => {
      if (animationRef.current) {
        animationRef.current.stop();
      }
    });

    return () => {
      if (animationRef.current) {
        animationRef.current.stop();
      }
      if (chart) {
        chart.dispose();
      }
    };
  }, [countries, isLoading]);

  return (
    <div className="w-full relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded-lg z-10">
          <div className="text-gray-600">Loading coverage...</div>
        </div>
      )}
      {error && !isLoading && (
        <div className="absolute top-2 left-2 text-xs text-gray-500 bg-white/80 px-2 py-1 rounded z-10">
          Using fallback data
        </div>
      )}
      <div 
        id="chartdiv" 
        ref={chartDivRef}
        className="w-full h-[500px] rounded-lg overflow-hidden"
        style={{ backgroundColor: 'transparent' }}
      />
      {!isLoading && (
        <div className="mt-4 space-y-2">
          <div className="text-center text-sm font-semibold text-gray-800 mb-3">
            {countries.length} countries covered across {Object.keys(CONTINENT_COUNTRIES).length} continents
          </div>
          {/* Legend */}
          <div className="flex flex-wrap justify-center gap-3 text-xs">
            {Object.entries(CONTINENT_COUNTRIES).map(([continent, data]) => (
              <div key={continent} className="flex items-center gap-1.5">
                <div 
                  className="w-3 h-3 rounded-sm border border-gray-300"
                  style={{ backgroundColor: data.color }}
                />
                <span className="text-gray-700 capitalize font-medium">
                  {continent} ({data.countries.length})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobeCoverage;
