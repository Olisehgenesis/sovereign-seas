// @ts-nocheck

import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Loader2, Shield, ExternalLink } from 'lucide-react';
import { useIdentitySDK } from '@goodsdks/citizen-sdk';
import { useAccount, useConnect } from 'wagmi';

const VerifyModal = ({ isOpen, onClose, onVerificationComplete }) => {
 const [verificationStatus, setVerificationStatus] = useState('idle'); // idle, checking, verified, failed, expired
 const [identityData, setIdentityData] = useState(null);
 const [isLoading, setIsLoading] = useState(false);
 const [error, setError] = useState('');

 // Actual Wagmi and GoodDollar SDK hooks
 const { address, isConnected } = useAccount();
 const { connect, connectors } = useConnect();
 const identitySDK = useIdentitySDK('production');

 // Reset state when modal opens
 useEffect(() => {
   if (isOpen) {
     setVerificationStatus('idle');
     setError('');
     setIdentityData(null);
     
     // Auto-check identity if wallet is already connected
     if (isConnected && address) {
       checkIdentityStatus();
     }
   }
 }, [isOpen, isConnected, address]);

 const connectWallet = async () => {
   setIsLoading(true);
   setError('');
   
   try {
     // Connect using the first available connector (usually MetaMask)
     const connector = connectors[0];
     if (connector) {
       await connect({ connector });
     } else {
       throw new Error('No wallet connectors available');
     }
   } catch (err) {
     setError(err.message || 'Failed to connect wallet');
   } finally {
     setIsLoading(false);
   }
 };

 const checkIdentityStatus = async () => {
   if (!address || !identitySDK) return;
   
   setIsLoading(true);
   setVerificationStatus('checking');
   setError('');

   try {
     // Check if the account is whitelisted
     const { isWhitelisted, root } = await identitySDK.getWhitelistedRoot(address);
     
     if (isWhitelisted) {
       // Check if identity has expired
       const expiryData = await identitySDK.getIdentityExpiryData(address);
       const isExpired = expiryData.isExpired;
       
       if (isExpired) {
         setVerificationStatus('expired');
         setIdentityData({ isWhitelisted, root, isExpired, expiryData });
       } else {
         setVerificationStatus('verified');
         setIdentityData({ isWhitelisted, root, isExpired, expiryData });
         
         // Notify parent component of successful verification
         setTimeout(() => {
           onVerificationComplete?.({ address, root, expiryData });
         }, 1500);
       }
     } else {
       setVerificationStatus('failed');
       setIdentityData({ isWhitelisted, root });
     }
   } catch (err) {
     console.error('Identity verification error:', err);
     setError(err.message || 'Failed to verify identity');
     setVerificationStatus('failed');
   } finally {
     setIsLoading(false);
   }
 };

 const startFaceVerification = async () => {
   try {
     setIsLoading(true);
     
     // Generate Face Verification link
     const fvLink = await identitySDK.generateFVLink(
       true, // popup mode
       window.location.href, // callback URL
       1 // chainId (1 for mainnet, adjust as needed)
     );
     
     // Open Face Verification in a new window
     const popup = window.open(fvLink, 'faceVerification', 'width=600,height=700,scrollbars=yes,resizable=yes');
     
     // Listen for popup close or callback
     const checkClosed = setInterval(() => {
       if (popup.closed) {
         clearInterval(checkClosed);
         // Re-check identity status after face verification
         setTimeout(() => {
           checkIdentityStatus();
         }, 2000);
       }
     }, 1000);
     
   } catch (err) {
     console.error('Face verification error:', err);
     setError(err.message || 'Failed to start face verification');
   } finally {
     setIsLoading(false);
   }
 };

 if (!isOpen) return null;

 return (
   <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 overflow-y-auto">
     <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl mt-4 sm:mt-8 lg:mt-16 mb-4">
       {/* Header */}
       <div className="flex justify-between items-center p-6 border-b">
         <h2 className="text-2xl font-bold text-gray-900">GoodDollar Verification</h2>
         <button
           onClick={onClose}
           className="text-gray-400 hover:text-gray-600 transition-colors"
         >
           <X className="h-6 w-6" />
         </button>
       </div>

       {/* Content based on connection and verification status */}
       {!isConnected ? (
         // Wallet not connected
         <div className="p-6 text-center">
           <div className="flex justify-center mb-4">
             <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
               <Shield className="w-8 h-8 text-blue-600" />
             </div>
           </div>
           <h3 className="text-xl font-semibold mb-2">Connect Your Wallet</h3>
           <p className="text-gray-600 mb-6">Connect your wallet to verify your GoodDollar identity</p>
           
           <div className="space-y-3 mb-4">
             <div className="text-sm text-gray-500">
               Wallet: {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Not connected'}
             </div>
           </div>
           
           {error && (
             <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
               <div className="flex items-center">
                 <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                 <span className="text-sm text-red-700">{error}</span>
               </div>
             </div>
           )}
           
           <button
             onClick={connectWallet}
             disabled={isLoading}
             className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
           >
             {isLoading ? (
               <>
                 <Loader2 className="animate-spin h-4 w-4 mr-2" />
                 Connecting...
               </>
             ) : (
               'Connect Wallet'
             )}
           </button>
         </div>
       ) : verificationStatus === 'checking' ? (
         // Checking verification status
         <div className="p-6 text-center">
           <div className="flex justify-center mb-4">
             <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
               <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
             </div>
           </div>
           <h3 className="text-xl font-semibold mb-2">Checking Identity</h3>
           <p className="text-gray-600 mb-4">Verifying your GoodDollar identity status...</p>
           
           <div className="space-y-2 text-sm text-gray-500">
             <div>Wallet: {address?.slice(0, 6)}...{address?.slice(-4)}</div>
             <div>Checking whitelist status...</div>
           </div>
         </div>
       ) : verificationStatus === 'verified' ? (
         // Successfully verified
         <div className="p-6 text-center">
           <div className="flex justify-center mb-4">
             <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
               <CheckCircle className="w-8 h-8 text-green-600" />
             </div>
           </div>
           <h3 className="text-xl font-semibold mb-2 text-green-800">Identity Verified!</h3>
           <p className="text-gray-600 mb-6">Your GoodDollar identity has been successfully verified.</p>
           
           <div className="space-y-3 mb-6">
             <div className="text-sm text-gray-600">
               <strong>Address:</strong> {address?.slice(0, 6)}...{address?.slice(-4)}
             </div>
             {identityData?.root && (
               <div className="text-sm text-gray-600">
                 <strong>Root:</strong> {identityData.root.slice(0, 6)}...{identityData.root.slice(-4)}
               </div>
             )}
             {identityData?.expiryData && (
               <div className="text-sm text-gray-600">
                 <strong>Expires:</strong> {new Date(Number(identityData.expiryData.expirationTimestamp) * 1000).toLocaleDateString()}
               </div>
             )}
           </div>
           
           <button
             onClick={onClose}
             className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
           >
             Continue
           </button>
         </div>
       ) : verificationStatus === 'expired' ? (
         // Identity expired - needs renewal
         <div className="p-6 text-center">
           <div className="flex justify-center mb-4">
             <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
               <AlertCircle className="w-8 h-8 text-orange-600" />
             </div>
           </div>
           <h3 className="text-xl font-semibold mb-2 text-orange-800">Identity Expired</h3>
           <p className="text-gray-600 mb-6">Your GoodDollar identity has expired and needs to be renewed.</p>
           
           <div className="space-y-3 mb-6">
             <div className="text-sm text-gray-600">
               <strong>Address:</strong> {address?.slice(0, 6)}...{address?.slice(-4)}
             </div>
             {identityData?.expiryData && (
               <div className="text-sm text-gray-600">
                 <strong>Expired:</strong> {new Date(Number(identityData.expiryData.expirationTimestamp) * 1000).toLocaleDateString()}
               </div>
             )}
           </div>
           
           {error && (
             <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
               <div className="flex items-center">
                 <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                 <span className="text-sm text-red-700">{error}</span>
               </div>
             </div>
           )}
           
           <div className="space-y-3">
             <button
               onClick={startFaceVerification}
               disabled={isLoading}
               className="w-full bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
             >
               {isLoading ? (
                 <>
                   <Loader2 className="animate-spin h-4 w-4 mr-2" />
                   Starting Verification...
                 </>
               ) : (
                 <>
                   <ExternalLink className="h-4 w-4 mr-2" />
                   Renew Identity
                 </>
               )}
             </button>
             
             <button
               onClick={onClose}
               className="w-full bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors"
             >
               Cancel
             </button>
           </div>
         </div>
       ) : (
         // Verification failed or not whitelisted
         <div className="p-6 text-center">
           <div className="flex justify-center mb-4">
             <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
               <AlertCircle className="w-8 h-8 text-red-600" />
             </div>
           </div>
           <h3 className="text-xl font-semibold mb-2 text-red-800">Verification Required</h3>
           <p className="text-gray-600 mb-6">Your wallet is not verified with GoodDollar. Complete face verification to get started.</p>
           
           <div className="space-y-3 mb-6">
             <div className="text-sm text-gray-600">
               <strong>Address:</strong> {address?.slice(0, 6)}...{address?.slice(-4)}
             </div>
           </div>
           
           {error && (
             <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
               <div className="flex items-center">
                 <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                 <span className="text-sm text-red-700">{error}</span>
               </div>
             </div>
           )}
           
           <div className="space-y-3">
             <button
               onClick={startFaceVerification}
               disabled={isLoading}
               className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
             >
               {isLoading ? (
                 <>
                   <Loader2 className="animate-spin h-4 w-4 mr-2" />
                   Starting Verification...
                 </>
               ) : (
                 <>
                   <ExternalLink className="h-4 w-4 mr-2" />
                   Start Face Verification
                 </>
               )}
             </button>
             
             <button
               onClick={checkIdentityStatus}
               disabled={isLoading}
               className="w-full bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
             >
               {isLoading ? (
                 <>
                   <Loader2 className="animate-spin h-4 w-4 mr-2" />
                   Checking...
                 </>
               ) : (
                 'Check Again'
               )}
             </button>
             
             <button
               onClick={onClose}
               className="w-full text-gray-600 px-6 py-2 hover:text-gray-800 transition-colors"
             >
               Cancel
             </button>
           </div>
         </div>
       )}
     </div>
   </div>
 );
};

// Demo component to show how to use the modal
const App = () => {
 const [showModal, setShowModal] = useState(false);
 
 const handleVerificationComplete = (data) => {
   console.log('Verification complete:', data);
   setShowModal(false);
   // Handle successful verification - save user data, redirect, etc.
 };

 return (
   <div className="min-h-screen bg-gray-100 flex items-center justify-center">
     <div className="text-center">
       <h1 className="text-3xl font-bold mb-8">GoodDollar App</h1>
       <button
         onClick={() => setShowModal(true)}
         className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors"
       >
         Verify Identity
       </button>
     </div>
     
     <VerifyModal 
       isOpen={showModal}
       onClose={() => setShowModal(false)}
       onVerificationComplete={handleVerificationComplete}
     />
   </div>
 );
};

export default VerifyModal;