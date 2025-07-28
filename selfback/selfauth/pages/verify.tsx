'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Dynamic imports to prevent SSR issues
const SelfQRcodeWrapper = dynamic(
  () => import('@selfxyz/qrcode').then((mod) => mod.SelfQRcodeWrapper),
  { ssr: false }
);

// Dynamic imports for other modules that might cause SSR issues
const getSelfModules = () => import('@selfxyz/core').then(mod => ({
  getUniversalLink: mod.getUniversalLink
}));

const getSelfQRModules = () => import('@selfxyz/qrcode').then(mod => ({
  SelfAppBuilder: mod.SelfAppBuilder
}));

const getEthers = () => import('ethers');

function VerificationPage() {
  const [selfApp, setSelfApp] = useState<any>(null);
  const [universalLink, setUniversalLink] = useState("");
  const [userId, setUserId] = useState<string>("0x0000000000000000000000000000000000000000");

  useEffect(() => {
    const initializeApp = async () => {
      try {
        const [selfModules, selfQRModules, ethersModule] = await Promise.all([
          getSelfModules(),
          getSelfQRModules(),
          getEthers()
        ]);

        const { SelfAppBuilder } = selfQRModules;
        const { getUniversalLink } = selfModules;
        const ethers = ethersModule;

        setUserId(ethers.constants.AddressZero);

        const app = new SelfAppBuilder({
          version: 2,
          appName: process.env.NEXT_PUBLIC_SELF_APP_NAME || "Sovereign Seas",
          scope: "seasv2",
          endpoint: "https://selfauth.vercel.app/api/verify",
          logoBase64: "https://i.postimg.cc/mrmVf9hm/self.png",
          userId: ethers.constants.AddressZero,
          endpointType: "https",
          userIdType: "hex",
          userDefinedData: "Bonjour Cannes!",
          disclosures: {
            minimumAge: 18,
            ofac: false,
            excludedCountries: [],
            nationality: true,
            gender: true,
          }
        }).build();

        setSelfApp(app);
        setUniversalLink(getUniversalLink(app));
      } catch (error) {
        console.error("Failed to initialize Self app:", error);
      }
    };

    initializeApp();
  }, []);

  const handleSuccessfulVerification = () => {
    console.log("Verification successful!");
    // Handle success - redirect, update UI, etc.
  };

  return (
    <div className="verification-container">
      <h1>Verify Your Identity</h1>
      <p>Scan this QR code with the Self app</p>
      
      {selfApp ? (
        <SelfQRcodeWrapper
          selfApp={selfApp}
          onSuccess={handleSuccessfulVerification}
          onError={() => {
            console.error("Error: Failed to verify identity");
          }}
        />
      ) : (
        <div>Loading QR Code...</div>
      )}
    </div>
  );
}

export default VerificationPage;