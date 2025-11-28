'use client';

import { CheckCircle, Shield } from 'lucide-react';
import { FileCode, Trophy, Vote, Coins } from 'lucide-react';
import CountryFlag from 'react-country-flag';
import { getFlagColorData } from '@/utils/flagUtils';
import { StatCard } from './StatCard';

interface ProfileHeaderProps {
  address: string | undefined;
  isVerified: boolean;
  verificationDetails: any;
  verificationProviders: string[];
  verificationLoading: boolean;
  onVerifyClick: () => void;
  onGoodDollarVerifyClick: () => void;
  userMetrics: {
    projects: number;
    campaigns: number;
    votes: number;
    balance: string;
  };
}

export const ProfileHeader = ({
  address,
  isVerified,
  verificationDetails,
  verificationProviders,
  verificationLoading,
  onVerifyClick,
  onGoodDollarVerifyClick,
  userMetrics
}: ProfileHeaderProps) => {
  return (
    <div className="group relative w-full mb-8">
      {/* Pattern Grid Overlay */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-50 transition-opacity duration-[400ms] z-[1]"
        style={{
          backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
          backgroundSize: '0.5em 0.5em'
        }}
      />
      
      {/* Main Card */}
      <div 
        className="relative bg-white border-[0.35em] border-[#2563eb] rounded-[0.6em] shadow-[0.7em_0.7em_0_#000000] transition-all duration-[400ms] overflow-hidden z-[2] group-hover:shadow-[1em_1em_0_#000000] group-hover:-translate-x-[0.4em] group-hover:-translate-y-[0.4em]"
        style={{ boxShadow: 'inset 0 0 0 0.15em rgba(0, 0, 0, 0.05)' }}
      >
        {/* Accent Corner */}
        <div className="absolute -top-[1em] -right-[1em] w-[4em] h-[4em] bg-[#2563eb] rotate-45 z-[1]" />
        <div className="absolute top-[0.4em] right-[0.4em] text-white text-[1.2em] font-bold z-[2]">★</div>
        
        <div className="relative px-[1.5em] py-[1.5em] z-[2]">
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
            {/* Avatar and Badges */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 bg-[#2563eb] rounded-[0.4em] flex items-center justify-center text-white text-xl font-extrabold border-[0.2em] border-[#050505] shadow-[0.3em_0.3em_0_#000000]">
                  {address?.slice(2, 4).toUpperCase()}
                </div>
                
                {/* Verification Badges */}
                <div className="flex flex-col gap-3 mt-4 w-48">
                  {/* GoodDollar Badge */}
                  <div className={`flex flex-col items-center p-3 rounded-[0.4em] border-[0.2em] shadow-[0.2em_0.2em_0_#000000] transition-all ${verificationDetails?.gooddollar?.isVerified ? 'bg-[#d1fae5] border-[#10b981]' : 'bg-gray-100 border-[#050505]'}`}>
                    <img src="/images/good.png" alt="GoodDollar" className={`h-5 w-5 mb-1 ${verificationDetails?.gooddollar?.isVerified ? '' : 'opacity-50'}`} />
                    <span className="text-base font-extrabold mb-0.5 text-[#050505] uppercase tracking-[0.05em]">GoodDollar</span>
                    {verificationDetails?.gooddollar?.isVerified ? (
                      <div className="flex items-center gap-1 mb-1">
                        <CheckCircle className="h-4 w-4 text-[#10b981]" />
                        <span className="text-[#10b981] font-bold text-xs">Verified</span>
                      </div>
                    ) : (
                      <button
                        className="mt-1 px-3 py-1 bg-[#10b981] text-white rounded-[0.3em] text-xs font-extrabold border-[0.15em] border-[#050505] shadow-[0.2em_0.2em_0_#000000] hover:shadow-[0.3em_0.3em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] transition-all uppercase tracking-[0.05em]"
                        onClick={onGoodDollarVerifyClick}
                      >
                        Verify
                      </button>
                    )}
                    {verificationDetails?.gooddollar?.isVerified && verificationDetails.gooddollar.expiry?.expiryDate && (() => {
                      try {
                        return (
                          <span className="mt-1 text-[10px] text-gray-500">
                            exp. {new Date(verificationDetails.gooddollar.expiry.expiryDate).toLocaleDateString()}
                          </span>
                        );
                      } catch {
                        return null;
                      }
                    })()}
                  </div>
                  
                  {/* Self Badge */}
                  <div className={`flex flex-col items-center p-3 rounded-[0.4em] border-[0.2em] shadow-[0.2em_0.2em_0_#000000] transition-all ${verificationDetails?.self?.isVerified ? 'bg-[#dbeafe] border-[#2563eb]' : 'bg-gray-100 border-[#050505]'}`}>
                    <Shield className={`h-5 w-5 mb-1 ${verificationDetails?.self?.isVerified ? 'text-[#2563eb]' : 'text-gray-400'}`} />
                    <span className="text-base font-extrabold mb-0.5 text-[#050505] uppercase tracking-[0.05em]">Self Protocol</span>
                    {verificationLoading ? (
                      <div className="flex items-center gap-1 mb-1">
                        <div className="h-4 w-4 border-2 border-[#2563eb] border-t-transparent rounded-full animate-spin" />
                        <span className="text-[#2563eb] font-bold text-xs">Loading...</span>
                      </div>
                    ) : verificationDetails?.self?.isVerified ? (
                      <div className="flex items-center gap-1 mb-1">
                        <CheckCircle className="h-4 w-4 text-[#2563eb]" />
                        <span className="text-[#2563eb] font-bold text-xs">Verified</span>
                      </div>
                    ) : (
                      <button
                        className="mt-1 px-3 py-1 bg-[#2563eb] text-white rounded-[0.3em] text-xs font-extrabold border-[0.15em] border-[#050505] shadow-[0.2em_0.2em_0_#000000] hover:shadow-[0.3em_0.3em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] transition-all uppercase tracking-[0.05em]"
                        onClick={onVerifyClick}
                      >
                        Verify
                      </button>
                    )}
                    {verificationDetails?.self?.isVerified && verificationDetails.self.nationality && (
                      <span className="mt-1 text-[10px] text-gray-500">{verificationDetails.self.nationality}</span>
                    )}
                    {verificationDetails?.self?.isVerified && verificationDetails.self.timestamp && (() => {
                      try {
                        return (
                          <span className="mt-1 text-[10px] text-gray-500">
                            {new Date(verificationDetails.self.timestamp).toLocaleDateString()}
                          </span>
                        );
                      } catch {
                        return null;
                      }
                    })()}
                  </div>
                </div>
                
                {isVerified && (
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-[#10b981] rounded-full flex items-center justify-center shadow-[0.2em_0.2em_0_#000000] border-[0.15em] border-[#050505]">
                    <CheckCircle className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
              
              {/* Profile Info */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl font-extrabold text-[#050505] uppercase tracking-[0.05em]">Profile</h1>
                  
                  {/* Nationality Flag */}
                  {verificationDetails?.self?.isVerified && verificationDetails.self.nationality && (() => {
                    const countryCode = verificationDetails.self.nationality.length === 3 
                      ? verificationDetails.self.nationality.substring(0, 2).toUpperCase()
                      : verificationDetails.self.nationality.toUpperCase();
                    
                    const flagData = getFlagColorData(countryCode);
                    const flagBorderColor = flagData?.borderColor || 'border-blue-200';
                    const flagBgColor = flagBorderColor.replace('border-', 'bg-').replace('-300', '-50');
                    
                    return (
                      <div className={`flex items-center gap-2 px-3 py-2 ${flagBgColor} rounded-full border ${flagBorderColor} shadow-sm`}>
                        <CountryFlag 
                          countryCode={countryCode} 
                          svg 
                          style={{ width: '1.2em', height: '1.2em', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))' }} 
                          title={`Nationality: ${verificationDetails.self.nationality}`}
                        />
                        <span className="text-sm font-semibold text-gray-800">
                          {verificationDetails.self.nationality}
                        </span>
                      </div>
                    );
                  })()}
                  
                  {isVerified ? (
                    <div className="flex items-center gap-2 px-2 py-1 bg-[#d1fae5] border-[0.15em] border-[#10b981] rounded-full shadow-[0.1em_0.1em_0_#000000]">
                      <Shield className="h-4 w-4 text-[#10b981]" />
                      <span className="text-xs font-medium text-[#065f46]">
                        Verified by {verificationProviders.length > 1 ? 'Multiple Providers' : verificationProviders[0] || 'Self Protocol'}
                      </span>
                    </div>
                  ) : (
                    <button
                      onClick={onVerifyClick}
                      className="flex items-center gap-1 px-2 py-1 bg-[#fef3c7] border-[0.15em] border-[#f59e0b] rounded-full shadow-[0.1em_0.1em_0_#000000] hover:shadow-[0.15em_0.15em_0_#000000] hover:-translate-x-[0.05em] hover:-translate-y-[0.05em] transition-all"
                    >
                      <Shield className="h-4 w-4 text-[#f59e0b]" />
                      <span className="text-xs font-medium text-[#92400e]">Verify</span>
                    </button>
                  )}
                </div>
                <p className="text-gray-600 text-sm font-mono bg-gray-50/50 px-2 py-1 rounded-lg border-[0.1em] border-gray-200">
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </p>
              </div>
            </div>
            
            {/* Stats Grid */}
            <div className="flex-1 lg:ml-auto">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={FileCode} label="Projects" value={userMetrics.projects} color="blue" />
                <StatCard icon={Trophy} label="Campaigns" value={userMetrics.campaigns} color="purple" />
                <StatCard icon={Vote} label="Votes" value={userMetrics.votes} color="green" />
                <StatCard icon={Coins} label="Balance" value={`${userMetrics.balance} CELO`} color="amber" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

