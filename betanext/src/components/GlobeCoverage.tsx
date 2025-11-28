import { useEffect, useRef, useState } from 'react';
import * as am4core from '@amcharts/amcharts4/core';
import * as am4maps from '@amcharts/amcharts4/maps';
import am4themes_animated from '@amcharts/amcharts4/themes/animated';
import am4geodata_worldLow from '@amcharts/amcharts4-geodata/worldLow';
import { getCode } from 'country-list';

// Apply theme
am4core.useTheme(am4themes_animated);

// Fallback dummy countries
const FALLBACK_COUNTRIES = {
  africa: [
    'Nigeria', 'South Africa', 'Kenya', 'Ghana', 'Ethiopia',
    'Tanzania', 'Uganda', 'Morocco', 'Algeria', 'Egypt'
  ],
  europe: [
    'United Kingdom', 'Germany', 'France', 'Italy', 'Spain',
    'Netherlands', 'Belgium', 'Switzerland', 'Austria', 'Sweden',
    'Norway', 'Denmark', 'Finland', 'Poland', 'Portugal',
    'Greece', 'Ireland', 'Czech Republic', 'Hungary', 'Romania'
  ],
  asia: [
    'China', 'Japan', 'India'
  ]
};

const DUMMY_COUNTRIES = [
  ...FALLBACK_COUNTRIES.africa,
  ...FALLBACK_COUNTRIES.europe,
  ...FALLBACK_COUNTRIES.asia
];

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
        
        // Try to fetch from the coverage API
        const response = await fetch('https://selfauth.vercel.app/api/coverage');
        
        if (!response.ok) {
          throw new Error('Failed to fetch coverage data');
        }
        
        const data: CoverageResponse = await response.json();
        
        if (data.countries && data.countries.length > 0) {
          setCountries(data.countries);
        } else {
          // If no countries, use dummy data
          setCountries(DUMMY_COUNTRIES);
        }
      } catch (err) {
        console.error('Error fetching coverage:', err);
        setError('Failed to load coverage data');
        // Use dummy countries as fallback
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
    polygonTemplate.fill = am4core.color('#3b82f6');
    polygonTemplate.stroke = am4core.color('#1e40af');
    polygonTemplate.strokeWidth = 0.5;
    polygonTemplate.cursorOverStyle = am4core.MouseCursorStyle.pointer;

    // Create hover state
    const hs = polygonTemplate.states.create('hover');
    hs.properties.fill = am4core.color('#2563eb');

    // Color countries based on selection
    if (countryCodes.length > 0) {
      polygonTemplate.adapter.add('fill', (_fill, target) => {
        const dataItem = target.dataItem;
        if (dataItem && dataItem.dataContext) {
          const context = dataItem.dataContext as any;
          const countryId = context.id || context.NAME;
          if (countryId && typeof countryId === 'string' && countryCodes.includes(countryId.toUpperCase())) {
            return am4core.color('#3b82f6');
          }
        }
        return am4core.color('#e5e7eb');
      });

      polygonTemplate.adapter.add('stroke', (_stroke, target) => {
        const dataItem = target.dataItem;
        if (dataItem && dataItem.dataContext) {
          const context = dataItem.dataContext as any;
          const countryId = context.id || context.NAME;
          if (countryId && typeof countryId === 'string' && countryCodes.includes(countryId.toUpperCase())) {
            return am4core.color('#1e40af');
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
        <div className="mt-2 text-center text-sm text-gray-600">
          {countries.length} countries covered
        </div>
      )}
    </div>
  );
};

export default GlobeCoverage;
