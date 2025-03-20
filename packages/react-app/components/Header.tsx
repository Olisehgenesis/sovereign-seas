import { Disclosure, Transition } from '@headlessui/react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useConnect, useAccount } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { Menu, X, ChevronDown, Globe, Award, Settings } from 'lucide-react';
import { usePathname } from 'next/navigation';

const navigation = [
  { name: 'Home', href: '/' },
  { name: 'Explore Campaigns', href: '/campaigns' },
  { name: 'Create Campaign', href: '/campaign/create' },
  { name: 'About', href: '/about' },
];

export default function Header() {
  const [hideConnectBtn, setHideConnectBtn] = useState(false);
  const { connect } = useConnect();
  const { isConnected } = useAccount();
  const [showDropdown, setShowDropdown] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (window.ethereum && window.ethereum.isMiniPay) {
      setHideConnectBtn(true);
      connect({ connector: injected({ target: 'metaMask' }) });
    }
  }, [connect]);

  return (
    <Disclosure as="nav" className="bg-gradient-to-r from-slate-900 to-slate-800 border-b border-lime-600/30 backdrop-blur-sm sticky top-0 z-50">
      {({ open }) => (
        <>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="relative flex h-20 items-center justify-between">
              <div className="absolute inset-y-0 left-0 flex items-center sm:hidden">
                {/* Mobile menu button */}
                <Disclosure.Button className="inline-flex items-center justify-center rounded-md p-2 text-slate-400 hover:bg-slate-700 hover:text-white">
                  <span className="sr-only">Open main menu</span>
                  {open ? (
                    <X className="block h-6 w-6" aria-hidden="true" />
                  ) : (
                    <Menu className="block h-6 w-6" aria-hidden="true" />
                  )}
                </Disclosure.Button>
              </div>
              
              {/* Logo and desktop navigation */}
              <div className="flex flex-1 items-center justify-center sm:items-stretch sm:justify-start">
                <div className="flex items-center">
                  <Link href="/" className="flex items-center">
                    <div className="relative h-10 w-10 mr-3">
                      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-lime-500 to-yellow-500 animate-pulse-slow opacity-40"></div>
                      <div className="absolute inset-0.5 rounded-full bg-slate-900 flex items-center justify-center">
                        <Image 
                          src="/logo.svg" 
                          alt="Sovereign Seas Logo"
                          width={20}
                          height={20}
                          className="h-5 w-5"
                        />
                      </div>
                    </div>
                    <span className="text-2xl font-bold text-white">
                      Sovereign <span className="text-yellow-400">Seas</span>
                    </span>
                  </Link>
                </div>
                
                {/* Desktop Navigation Links */}
                <div className="hidden sm:ml-12 sm:flex sm:space-x-4">
                  {navigation.map((item) => {
                    const isActive = pathname === item.href || 
                                    (item.href !== '/' && pathname?.startsWith(item.href));
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={`
                          px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200
                          ${isActive 
                            ? 'bg-lime-600/20 text-lime-400 border border-lime-500/30' 
                            : 'text-slate-300 hover:bg-slate-700/60 hover:text-white'}
                        `}
                      >
                        {item.name}
                      </Link>
                    );
                  })}
                </div>
              </div>
              
              {/* Right side - Connect Wallet & User Menu */}
              <div className="absolute inset-y-0 right-0 flex items-center sm:static sm:inset-auto">
                {isConnected && (
                  <div className="relative mr-3">
                    <button
                      onClick={() => setShowDropdown(!showDropdown)}
                      className="flex items-center bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg py-1.5 px-3 text-sm transition-colors"
                    >
                      My Dashboard
                      <ChevronDown className={`ml-1 h-4 w-4 transform transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {/* Dropdown Menu */}
                    <Transition
                      show={showDropdown}
                      enter="transition ease-out duration-100"
                      enterFrom="transform opacity-0 scale-95"
                      enterTo="transform opacity-100 scale-100"
                      leave="transition ease-in duration-75"
                      leaveFrom="transform opacity-100 scale-100"
                      leaveTo="transform opacity-0 scale-95"
                    >
                      <div 
                        className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-lg py-1 z-50"
                        onMouseLeave={() => setShowDropdown(false)}
                      >
                        <Link
                          href="/dashboard"
                          className="flex items-center px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white"
                        >
                          <Globe className="mr-2 h-4 w-4 text-lime-500" />
                          My Campaigns
                        </Link>
                        <Link
                          href="/votes"
                          className="flex items-center px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white"
                        >
                          <Award className="mr-2 h-4 w-4 text-yellow-500" />
                          My Votes
                        </Link>
                        <Link
                          href="/settings"
                          className="flex items-center px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white"
                        >
                          <Settings className="mr-2 h-4 w-4 text-slate-400" />
                          Settings
                        </Link>
                      </div>
                    </Transition>
                  </div>
                )}
                
                {!hideConnectBtn && (
                  <div className="custom-connect-button">
                    <ConnectButton 
                      showBalance={{
                        smallScreen: false,
                        largeScreen: true,
                      }}
                      chainStatus={{
                        smallScreen: "icon",
                        largeScreen: "full",
                      }}
                      accountStatus={{
                        smallScreen: "address",
                        largeScreen: "full",
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Mobile menu */}
          <Disclosure.Panel className="sm:hidden">
            <div className="space-y-1 px-3 pt-2 pb-3">
              {navigation.map((item) => {
                const isActive = pathname === item.href || 
                               (item.href !== '/' && pathname?.startsWith(item.href));
                return (
                  <Disclosure.Button
                    key={item.name}
                    as={Link}
                    href={item.href}
                    className={`
                      block px-3 py-2 rounded-md text-base font-medium ${
                        isActive 
                          ? 'bg-lime-600/20 text-lime-400 border border-lime-500/30' 
                          : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                      }
                    `}
                  >
                    {item.name}
                  </Disclosure.Button>
                );
              })}
              
              {isConnected && (
                <>
                  <div className="mt-4 pt-4 border-t border-slate-700">
                    <div className="px-2 text-xs uppercase text-slate-500 font-semibold">
                      My Account
                    </div>
                    <Disclosure.Button
                      as={Link}
                      href="/dashboard"
                      className="flex items-center mt-2 px-3 py-2 rounded-md text-base font-medium text-slate-300 hover:bg-slate-700 hover:text-white"
                    >
                      <Globe className="mr-2 h-4 w-4 text-lime-500" />
                      My Campaigns
                    </Disclosure.Button>
                    <Disclosure.Button
                      as={Link}
                      href="/votes"
                      className="flex items-center px-3 py-2 rounded-md text-base font-medium text-slate-300 hover:bg-slate-700 hover:text-white"
                    >
                      <Award className="mr-2 h-4 w-4 text-yellow-500" />
                      My Votes
                    </Disclosure.Button>
                  </div>
                </>
              )}
            </div>
          </Disclosure.Panel>
        </>
      )}
    </Disclosure>
  );
}