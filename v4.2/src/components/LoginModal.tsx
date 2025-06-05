import { Dialog, Transition } from '@headlessui/react';
import { Fragment, useState } from 'react';
import { useUser } from '@civic/auth-web3/react';
import { useConnect, useAccount } from 'wagmi';
import { Wallet, X, ChevronDown } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const { signIn } = useUser();
  const { connect, connectors } = useConnect();
  const { isConnected } = useAccount();
  const [showWalletOptions, setShowWalletOptions] = useState(false);

  const handleSocialLogin = () => {
    signIn();
    onClose();
  };

  const handleWalletConnect = (connector: any) => {
    connect({ connector });
    setShowWalletOptions(false);
    onClose();
  };

  const availableConnectors = connectors.filter(connector => connector.ready);

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex justify-between items-center mb-8">
                  <Dialog.Title
                    as="h3"
                    className="text-xl font-semibold leading-6 text-gray-900"
                  >
                    Connect to Continue
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="rounded-full p-1 hover:bg-gray-100 transition-colors"
                  >
                    <X className="h-5 w-5 text-gray-500" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Civic Login Button */}
                  <button
                    onClick={handleSocialLogin}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-medium hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
                  >
                    <img
                      src="https://auth.civic.com/logos/civic-logo.png"
                      alt="Civic"
                      className="h-6 w-6"
                    />
                    <span>Continue with Civic</span>
                  </button>

                  {/* Wallet Connect Button with Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setShowWalletOptions(!showWalletOptions)}
                      disabled={isConnected || availableConnectors.length === 0}
                      className="w-full flex items-center justify-center gap-3 px-4 py-3.5 border-2 border-gray-200 rounded-xl font-medium text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Wallet className="h-5 w-5" />
                      <span>Connect Wallet</span>
                      <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${showWalletOptions ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Wallet Options Dropdown */}
                    {showWalletOptions && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-10">
                        {availableConnectors.map((connector) => (
                          <button
                            key={connector.uid}
                            onClick={() => handleWalletConnect(connector)}
                            className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <img
                              src={connector.icon}
                              alt={connector.name}
                              className="h-6 w-6"
                            />
                            <span>{connector.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* No Wallets Available Message */}
                  {availableConnectors.length === 0 && (
                    <p className="text-sm text-gray-500 text-center mt-2">
                      No wallet extensions detected. Please install a wallet to continue.
                    </p>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
} 