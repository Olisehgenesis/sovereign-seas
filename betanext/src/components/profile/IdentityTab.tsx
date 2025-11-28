'use client';

import { Shield, CheckCircle, AlertCircle, UserCheck, User, CreditCard } from 'lucide-react';
import { ButtonCool } from '@/components/ui/button-cool';

interface IdentityTabProps {
  isVerified: boolean;
  verificationProviders: string[];
  verificationDetails: any;
  verificationLoading: boolean;
  onVerifyClick: () => void;
  onMethodSelectionClick: () => void;
  debugApiCall?: () => void;
  refreshVerificationData?: () => void;
  showDebugTools?: boolean;
}

export const IdentityTab = ({
  isVerified,
  verificationProviders,
  verificationDetails,
  verificationLoading,
  onVerifyClick,
  onMethodSelectionClick,
  debugApiCall,
  refreshVerificationData,
  showDebugTools = false
}: IdentityTabProps) => {
  return (
    <div className="space-y-6">
      {/* Identity Status */}
      <div className="group relative w-full">
        <div 
          className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-50 transition-opacity duration-[400ms] z-[1]"
          style={{
            backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
            backgroundSize: '0.5em 0.5em'
          }}
        />
        
        <div 
          className="relative bg-white border-[0.35em] border-[#2563eb] rounded-[0.6em] shadow-[0.7em_0.7em_0_#000000] transition-all duration-[400ms] overflow-hidden z-[2]"
          style={{ boxShadow: 'inset 0 0 0 0.15em rgba(0, 0, 0, 0.05)' }}
        >
          <div className="absolute -top-[1em] -right-[1em] w-[4em] h-[4em] bg-[#2563eb] rotate-45 z-[1]" />
          <div className="absolute top-[0.4em] right-[0.4em] text-white text-[1.2em] font-bold z-[2]">★</div>
          
          <div className="relative px-[1.5em] py-[1.5em] z-[2]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-[0.4em] flex items-center justify-center border-[0.2em] border-[#050505] shadow-[0.2em_0.2em_0_#000000] ${
                  isVerified ? 'bg-[#d1fae5] border-[#10b981]' : 'bg-[#fef3c7] border-[#f59e0b]'
                }`}>
                  <Shield className={`h-6 w-6 ${
                    isVerified ? 'text-[#10b981]' : 'text-[#f59e0b]'
                  }`} />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-[#050505] uppercase tracking-[0.05em]">
                    Identity Verification
                  </h2>
                  <p className="text-sm text-[#050505] font-semibold">
                    {isVerified ? 'Your identity has been verified' : 'Verify your identity for enhanced security'}
                  </p>
                </div>
              </div>
              {isVerified && (
                <div className="flex items-center gap-2 px-3 py-2 bg-[#d1fae5] border-[0.2em] border-[#10b981] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000]">
                  <CheckCircle className="h-4 w-4 text-[#10b981]" />
                  <span className="text-sm font-extrabold text-[#065f46] uppercase tracking-[0.05em]">
                    Verified ({verificationProviders.join(', ')})
                  </span>
                </div>
              )}
            </div>

            {/* Verification Progress Circle */}
            <div className="flex items-center justify-center mb-6">
              <div className="relative">
                <svg className="w-24 h-24 transform -rotate-90">
                  <circle
                    cx="48"
                    cy="48"
                    r="36"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    className="text-gray-200"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r="36"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    className="text-[#10b981]"
                    strokeLinecap="round"
                    style={{ 
                      strokeDasharray: `${isVerified ? 226 : 113} 226`,
                      transition: 'stroke-dasharray 0.3s ease-in-out'
                    }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-2xl font-extrabold text-[#050505]">
                      {isVerified ? '100%' : '50%'}
                    </div>
                    <div className="text-xs text-[#050505] font-semibold uppercase tracking-[0.05em]">Verified</div>
                  </div>
                </div>
              </div>
            </div>

            {!isVerified && (
              <div className="bg-[#fef3c7] border-[0.2em] border-[#f59e0b] rounded-[0.4em] p-4 mb-6 shadow-[0.2em_0.2em_0_#000000]">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-[#f59e0b] mt-0.5" />
                  <div>
                    <h3 className="font-extrabold text-[#92400e] mb-1 uppercase tracking-[0.05em]">
                      V3 Preview: Anti-Sybil Future
                    </h3>
                    <p className="text-sm text-[#92400e] mb-3 font-semibold">
                      With the upcoming V3 release, identity verification through Self Protocol will help prevent Sybil attacks and ensure fair participation in campaigns and voting.
                    </p>
                    <ul className="text-sm text-[#92400e] space-y-1 font-semibold">
                      <li>• Enhanced voting integrity</li>
                      <li>• Reduced spam and fake accounts</li>
                      <li>• Increased trust in project funding</li>
                      <li>• Better reputation system</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Verification Actions */}
            <div className="space-y-4">
              {!isVerified ? (
                <ButtonCool
                  onClick={onMethodSelectionClick}
                  text="Start Identity Verification"
                  bgColor="#2563eb"
                  hoverBgColor="#1d4ed8"
                  textColor="#ffffff"
                  borderColor="#050505"
                  size="md"
                >
                  <UserCheck className="w-4 h-4" />
                </ButtonCool>
              ) : (
                <div className="bg-[#d1fae5] border-[0.2em] border-[#10b981] rounded-[0.4em] p-4 shadow-[0.2em_0.2em_0_#000000]">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-6 w-6 text-[#10b981]" />
                    <div>
                      <h3 className="font-extrabold text-[#065f46] uppercase tracking-[0.05em]">Identity Verified</h3>
                      <p className="text-sm text-[#065f46] font-semibold">
                        Your account is verified and ready for V3 features
                      </p>
                      {verificationProviders.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-[#10b981] font-extrabold uppercase tracking-[0.05em]">Verification Methods:</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {verificationProviders.map((provider, index) => (
                              <span 
                                key={index}
                                className="px-2 py-1 bg-[#10b981] text-white rounded-[0.3em] text-xs font-extrabold border-[0.15em] border-[#050505] shadow-[0.1em_0.1em_0_#000000] uppercase tracking-[0.05em]"
                              >
                                {provider === 'self' ? 'Self Protocol' : 
                                 provider === 'gooddollar' ? 'GoodDollar' : provider}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Benefits */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-[#dbeafe] border-[0.2em] border-[#2563eb] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000]">
                <h4 className="font-extrabold text-[#1e40af] mb-2 uppercase tracking-[0.05em]">Enhanced Security</h4>
                <p className="text-sm text-[#1e40af] font-semibold">
                  Protect your account and participate in verified-only campaigns
                </p>
              </div>
              <div className="p-4 bg-[#f3e8ff] border-[0.2em] border-[#a855f7] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000]">
                <h4 className="font-extrabold text-[#6b21a8] mb-2 uppercase tracking-[0.05em]">Reputation Building</h4>
                <p className="text-sm text-[#6b21a8] font-semibold">
                  Build trust within the community with verified identity
                </p>
              </div>
            </div>

            {/* Debug Section (only in development) */}
            {showDebugTools && (
              <div className="mt-6 p-4 bg-[#fef3c7] border-[0.2em] border-[#f59e0b] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000]">
                <h4 className="font-extrabold text-[#92400e] mb-2 uppercase tracking-[0.05em]">Debug Tools</h4>
                <p className="text-sm text-[#92400e] mb-3 font-semibold">
                  Development tools to help debug verification issues
                </p>
                <div className="space-y-2">
                  {debugApiCall && (
                    <ButtonCool
                      onClick={debugApiCall}
                      text="Test API Call"
                      bgColor="#f59e0b"
                      hoverBgColor="#d97706"
                      textColor="#ffffff"
                      borderColor="#050505"
                      size="sm"
                    />
                  )}
                  {refreshVerificationData && (
                    <ButtonCool
                      onClick={refreshVerificationData}
                      text="Refresh Data"
                      bgColor="#2563eb"
                      hoverBgColor="#1d4ed8"
                      textColor="#ffffff"
                      borderColor="#050505"
                      size="sm"
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

