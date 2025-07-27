'use client';

import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useAccount } from 'wagmi';

// Dynamic imports for Self SDK modules
const getSelfModules = () => import('@selfxyz/core').then(mod => ({
  getUniversalLink: mod.getUniversalLink
}));

const getSelfQRModules = () => import('@selfxyz/qrcode').then(mod => ({
  SelfAppBuilder: mod.SelfAppBuilder,
  SelfQRcodeWrapper: mod.SelfQRcodeWrapper
}));

const getEthers = () => import('ethers');

export default function VerifyPage() {
    const [userId, setUserId] = useState<string | null>(null);
    const [isVerified, setIsVerified] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selfApp, setSelfApp] = useState<any>(null);
    const [SelfQRcodeWrapper, setSelfQRcodeWrapper] = useState<any>(null);

    useEffect(() => {
        if (!userId) {
            const newUserId = uuidv4();
            setUserId(newUserId);
            console.log('Generated userId:', newUserId);
        }
    }, [userId]);

    useEffect(() => {
        const initializeApp = async () => {
            if (!userId) return;
            
            try {
                const [selfModules, selfQRModules, ethersModule] = await Promise.all([
                    getSelfModules(),
                    getSelfQRModules(),
                    getEthers()
                ]);

                const { SelfAppBuilder } = selfQRModules;
                const { getUniversalLink } = selfModules;
                const ethers = ethersModule;

                setSelfQRcodeWrapper(selfQRModules.SelfQRcodeWrapper);

                const app = new SelfAppBuilder({
                    appName: "Sovereign Seas",
                    scope: "sovereign-seas",
                    endpoint: "https://auth.sovseas.xyz/api/verify",
                    endpointType: "https",
                    userId,
                    disclosures: {
                        name: true,
                        date_of_birth: true,
                        nationality: true,
                        minimumAge: 18,
                        ofac: true,
                    }
                }).build();

                setSelfApp(app);
            } catch (error: any) {
                console.error("Failed to initialize Self app:", error);
                setError("Failed to initialize verification app");
            }
        };

        initializeApp();
    }, [userId]);

    if (!userId) return null;

    const handleVerificationSuccess = async () => {
        console.log('Verification successful');
        const address =  useAccount();
        if (!address) {
            setError('No wallet address found');
            return;
        }
        try {
            console.log('Starting verification process...');
            const response = await fetch('https://auth.sovseas.xyz/api/save-verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    wallet: address,
                    verificationStatus: true 
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Verification response:', data);

            if (data.success) {
                console.log('Verification successful');
                setIsVerified(true);
                setError(null);
                // Redirect to me page after successful verification
                window.location.href = 'https://sovseas.xyz/app/me/';
            } else {
                console.error('Verification failed:', data.error);
                setError(data.error || 'Verification failed. Please try again.');
            }
        } catch (err) {
            console.error('Error during verification:', err);
            setError(err instanceof Error ? err.message : 'Failed to verify identity. Please try again.');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 max-w-md w-full">
                <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Verify Your Identity</h1>
                    <p className="text-gray-600 text-sm">
                        Scan the QR code with the Self app to verify your identity
                    </p>
                </div>

                <div className="flex justify-center mb-6">
                    {selfApp && SelfQRcodeWrapper ? (
                        <SelfQRcodeWrapper
                            selfApp={selfApp}
                            onSuccess={handleVerificationSuccess}
                            size={250}
                        />
                    ) : (
                        <div className="flex items-center justify-center p-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            <span className="ml-2 text-gray-600">Loading QR Code...</span>
                        </div>
                    )}
                </div>

                <div className="text-center space-y-2">
                    <p className="text-xs text-gray-500">
                        User ID: {userId.substring(0, 8)}...{userId.substring(userId.length - 6)}
                    </p>
                    {isVerified && (
                        <div className="text-green-600 text-sm font-medium">
                            ✓ Identity verified successfully
                        </div>
                    )}
                    {error && (
                        <div className="text-red-600 text-sm font-medium">
                            ✗ {error}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
} 
