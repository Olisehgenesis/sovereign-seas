'use client';

import React, { useState, useEffect } from 'react';
import SelfQRcodeWrapper, { SelfAppBuilder } from '@selfxyz/qrcode';
import { v4 as uuidv4 } from 'uuid';

export default function VerificationPage() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // Generate a user ID when the component mounts
    setUserId(uuidv4());
  }, []);

  if (!userId) return null;

  // Create the SelfApp configuration
  const selfApp = new SelfAppBuilder({
    appName: "Sovereign Seas",
    scope: "sovereign-seas",
    endpoint: `${process.env.NEXT_PUBLIC_APP_URL}/api/verify`,
    endpointType: "https",
    userId,
  }).build();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Verify Your Identity</h1>
          <p className="mt-2 text-gray-600">
            Scan this QR code with the Self app to verify your identity
          </p>
        </div>
        
        <div className="flex justify-center">
          <SelfQRcodeWrapper
            selfApp={selfApp}
            onSuccess={() => {
              console.log("Verification successful!");
              // You can add additional logic here, like redirecting to a success page
            }}
            size={350}
          />
        </div>
        
        <div className="text-center text-sm text-gray-500">
          <p>User ID: {userId.substring(0, 8)}...</p>
        </div>
      </div>
    </div>
  );
} 