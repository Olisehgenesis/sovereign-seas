'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Smartphone } from 'lucide-react';

interface VerificationComponentProps {
  onSuccess: () => void;
  onError: (error: any) => void;
}

export const VerificationComponent = ({ onSuccess, onError }: VerificationComponentProps) => {
  const { address } = useAccount();
  const [universalLink, setUniversalLink] = useState<string | null>(null);
  const [selfApp, setSelfApp] = useState<any>(null);
  const [SelfQRcodeWrapper, setSelfQRcodeWrapper] = useState<any>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsClient(true);
      Promise.all([
        import('@selfxyz/qrcode').then(mod => mod.SelfAppBuilder),
        import('@selfxyz/qrcode').then(mod => mod.SelfQRcodeWrapper),
        import('@selfxyz/core').then(mod => mod.getUniversalLink)
      ]).then(([SelfAppBuilder, QRWrapper, getUniversalLink]) => {
        setSelfQRcodeWrapper(() => QRWrapper);
        
        if (address) {
          const app = new SelfAppBuilder({
            version : 2,
            appName: "Sovereign Seas",
            scope: "seasv2",
            endpoint: "https://selfauth.vercel.app/api/verify",
            logoBase64: "https://i.postimg.cc/mrmVf9hm/self.png",
            endpointType: "https",
            userDefinedData: "Sovereign Seas V4.2",
            userId: address,
            userIdType: "hex",
            disclosures: {
              nationality: true,
              minimumAge: 18,
              gender: true,
              excludedCountries: [],
              ofac: false,
            },
          }).build();
          setSelfApp(app);
          setUniversalLink(getUniversalLink(app as any));
        }
      }).catch(err => {
        console.error('Failed to load selfxyz modules:', err);
      });
    }
  }, [address]);

  if (!isClient || !address || !selfApp) return null;

  return (
    <div>
      <div className="md:hidden flex flex-col items-center gap-2 mb-4">
        <button
          onClick={() => {
            if (universalLink && typeof window !== 'undefined') {
              window.open(universalLink, '_blank');
            }
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition-colors duration-150 font-medium"
        >
          <Smartphone className="h-5 w-5" />
          Open Self App
        </button>
        <p className="text-xs text-gray-500">Tap to open the Self app directly</p>
      </div>
      {SelfQRcodeWrapper && (
        <div className="hidden md:flex justify-center">
          <SelfQRcodeWrapper
            selfApp={selfApp}
            onSuccess={onSuccess}
            darkMode={true}
            onError={onError}
          />
        </div>
      )}
    </div>
  );
};

