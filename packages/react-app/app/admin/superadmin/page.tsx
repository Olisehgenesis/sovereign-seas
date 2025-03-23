'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Shield, 
  AlertCircle,
  DollarSign,
  UserPlus,
  UserMinus,
  RefreshCw,
  Check,
  X,
  ArrowRight,
  Wallet
} from 'lucide-react';
import { useSovereignSeas } from '../../../hooks/useSovereignSeas';
import { useAccount } from 'wagmi';
import { formatEther, parseEther } from 'viem';

// Contract addresses
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`
const CELO_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_CELO_TOKEN_ADDRESS as `0x${string}`

export default function SuperAdminDashboard() {
  const router = useRouter();
  const { address } = useAccount();
  const [isMounted, setIsMounted] = useState(false);
  const [writeData, setWriteData] = useState<string | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  
  // Form states
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [newSuperAdmin, setNewSuperAdmin] = useState("");
  const [removeSuperAdmin, setRemoveSuperAdmin] = useState("");
  
  // Feedback states
  const [notification, setNotification] = useState({ message: "", type: "" });
  
  // Custom hooks
  const {
    isInitialized,
    isSuperAdmin,
    publicClient,
    creationFees,
    loadingFees,
    
    // Super admin functions
    loadCreationFees,
    withdrawCreationFees,
    addSuperAdmin,
    removeSuperAdmin: removeSuperAdminFn,
    
    // Transaction state
    isWritePending,
    isWriteSuccess,
    isWaitingForTx,
    isTxSuccess,
    writeError,
    resetWrite,
    txReceipt,
  } = useSovereignSeas({
    contractAddress: CONTRACT_ADDRESS,
    celoTokenAddress: CELO_TOKEN_ADDRESS,
  });

  // Initialize component
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Check authentication
  useEffect(() => {
    if (isInitialized) {
      setIsAuthChecking(false);
    }
  }, [isInitialized]);

  // Load fees on initialization
  useEffect(() => {
    if (isInitialized && isSuperAdmin) {
      loadCreationFees();
    }
  }, [isInitialized, isSuperAdmin, loadCreationFees]);

  // Reset notification after a delay
  useEffect(() => {
    if (notification.message) {
      const timer = setTimeout(() => {
        setNotification({ message: "", type: "" });
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Handle transaction state changes
  useEffect(() => {
    if (isWriteSuccess) {
      setNotification({ message: "Transaction sent successfully", type: "success" });
    }
    
    if (isTxSuccess) {
      setNotification({ message: "Transaction confirmed successfully", type: "success" });
      
      // Reset forms
      setWithdrawAmount("");
      setNewSuperAdmin("");
      setRemoveSuperAdmin("");
      
      // Refresh data
      loadCreationFees();
    }
    
    if (writeError) {
      setNotification({ 
        message: `Error: ${writeError.message.split('\n')[0]}`, 
        type: "error" 
      });
      if (txReceipt) {
        setWriteData(txReceipt.transactionHash);
      }
    }
  }, [isWriteSuccess, isTxSuccess, writeError, loadCreationFees, txReceipt]);
  

  // Handle withdraw submission
  const handleWithdraw = async (e: { preventDefault: () => void; }) => {
    e.preventDefault();
    
    try {
      const amount = withdrawAmount === "" ? "0" : withdrawAmount;
      await withdrawCreationFees(amount);
    } catch (error) {
      console.error('Error withdrawing fees:', error);
      setNotification({ 
        message: `Error: ${(error as any).message || "Failed to withdraw"}`, 
        type: "error" 
      });
    }
  };

  // Handle add super admin submission
  const handleAddSuperAdmin = async (e: { preventDefault: () => void; }) => {
    e.preventDefault();
    
    if (!newSuperAdmin || !newSuperAdmin.startsWith('0x')) {
      setNotification({ message: "Please enter a valid Ethereum address", type: "error" });
      return;
    }
    
    try {
      await addSuperAdmin(newSuperAdmin);
    } catch (error: any) {
      console.error('Error adding super admin:', error);
      setNotification({ 
        message: `Error: ${error.message || "Failed to add super admin"}`, 
        type: "error" 
      });
    }
  };

  // Handle remove super admin submission
  const handleRemoveSuperAdmin = async (e: { preventDefault: () => void; }) => {
    e.preventDefault();
    
    if (!removeSuperAdmin || !removeSuperAdmin.startsWith('0x')) {
      setNotification({ message: "Please enter a valid Ethereum address", type: "error" });
      return;
    }
    
    try {
      await removeSuperAdminFn(removeSuperAdmin);
    } catch (error: any) {
      console.error('Error removing super admin:', error);
      setNotification({ 
        message: `Error: ${error.message || "Failed to remove super admin"}`, 
        type: "error" 
      });
    }
  };

  // Format fees for display
  const formatFees = (fees: bigint) => {
    if (!fees) return "0";
    return formatEther(fees);
  };

  // If component is still checking authorization or not mounted, show loading
  if (isAuthChecking || !isMounted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-teal-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  // If not a super admin, show access denied
  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-teal-50 flex flex-col items-center justify-center p-4">
        <div className="h-16 w-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="h-8 w-8 text-amber-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Access Restricted</h1>
        <p className="text-gray-600 text-center mb-6">You don't have permission to access the super admin dashboard.</p>
        <button
          onClick={() => router.push('/')}
          className="px-4 py-2 bg-emerald-500 text-white rounded-full hover:bg-emerald-600 transition-colors"
        >
          Return to Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-teal-50">
      {/* Header */}
      <div className="container mx-auto px-4 py-10">
        <div className="flex items-center mb-6">
          <div className="h-12 w-12 bg-indigo-100 rounded-full flex items-center justify-center mr-4">
            <Shield className="h-6 w-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800 tilt-neon">Super Admin Dashboard</h1>
            <p className="text-gray-600">Manage platform settings and withdraw funds</p>
          </div>
        </div>
      </div>
      
      {/* Notification */}
      {notification.message && (
        <div className={`container mx-auto px-4 mb-6`}>
          <div className={`p-4 rounded-lg flex items-start ${notification.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
            <div className="h-5 w-5 mr-3 mt-0.5">
              {notification.type === 'error' ? (
                <X className="h-5 w-5" />
              ) : (
                <Check className="h-5 w-5" />
              )}
            </div>
            <div>
              <p>{notification.message}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Main Content */}
      <div className="container mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Withdraw Fees */}
          <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center mb-6">
                <div className="h-10 w-10 bg-emerald-100 rounded-full flex items-center justify-center mr-3">
                  <DollarSign className="h-5 w-5 text-emerald-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-800">Withdraw Creation Fees</h2>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Available Fees:</span>
                  <div className="flex items-center">
                    {loadingFees ? (
                      <div className="h-4 w-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mr-2"></div>
                    ) : (
                      <button 
                        onClick={loadCreationFees}
                        className="text-emerald-500 hover:text-emerald-600 mr-2"
                        disabled={isWritePending || isWaitingForTx}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </button>
                    )}
                    <span className="text-xl font-bold text-emerald-600">
                      {formatFees(creationFees)} CELO
                    </span>
                  </div>
                </div>
              </div>
              
              <form onSubmit={handleWithdraw}>
                <div className="mb-6">
                  <label htmlFor="withdrawAmount" className="block text-gray-700 text-sm font-medium mb-2">
                    Amount to Withdraw (CELO)
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <input
                      type="text"
                      id="withdrawAmount"
                      className="block w-full pl-3 pr-12 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      placeholder="Enter amount (leave empty to withdraw all)"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      disabled={isWritePending || isWaitingForTx}
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                      <span className="text-gray-500">CELO</span>
                    </div>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    Leave empty to withdraw all available fees
                  </p>
                </div>
                
                <button
                  type="submit"
                  className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 ${
                    (isWritePending || isWaitingForTx) ? 'opacity-75 cursor-not-allowed' : ''
                  }`}
                  disabled={isWritePending || isWaitingForTx}
                >
                  {isWritePending || isWaitingForTx ? (
                    <>
                      <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      {isWritePending ? 'Confirming...' : 'Processing...'}
                    </>
                  ) : (
                    <>
                      <Wallet className="h-5 w-5 mr-2" />
                      Withdraw Fees
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
          
          {/* Manage Super Admins */}
          <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center mb-6">
                <div className="h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                  <Shield className="h-5 w-5 text-purple-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-800">Manage Super Admins</h2>
              </div>
              
              <div className="space-y-6">
                {/* Add Super Admin */}
                <form onSubmit={handleAddSuperAdmin}>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Add Super Admin</h3>
                  <div className="mb-4">
                    <label htmlFor="newSuperAdmin" className="block text-gray-700 text-sm font-medium mb-2">
                      Wallet Address
                    </label>
                    <input
                      type="text"
                      id="newSuperAdmin"
                      className="block w-full px-3 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder="0x..."
                      value={newSuperAdmin}
                      onChange={(e) => setNewSuperAdmin(e.target.value)}
                      disabled={isWritePending || isWaitingForTx}
                    />
                  </div>
                  
                  <button
                    type="submit"
                    className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 ${
                      (isWritePending || isWaitingForTx) ? 'opacity-75 cursor-not-allowed' : ''
                    }`}
                    disabled={isWritePending || isWaitingForTx}
                  >
                    {isWritePending || isWaitingForTx ? (
                      <>
                        <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-5 w-5 mr-2" />
                        Add Super Admin
                      </>
                    )}
                  </button>
                </form>
                
                <div className="border-t border-gray-200 my-6 py-6">
                  {/* Remove Super Admin */}
                  <form onSubmit={handleRemoveSuperAdmin}>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Remove Super Admin</h3>
                    <div className="mb-4">
                      <label htmlFor="removeSuperAdmin" className="block text-gray-700 text-sm font-medium mb-2">
                        Wallet Address
                      </label>
                      <input
                        type="text"
                        id="removeSuperAdmin"
                        className="block w-full px-3 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        placeholder="0x..."
                        value={removeSuperAdmin}
                        onChange={(e) => setRemoveSuperAdmin(e.target.value)}
                        disabled={isWritePending || isWaitingForTx}
                      />
                    </div>
                    
                    <button
                      type="submit"
                      className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ${
                        (isWritePending || isWaitingForTx) ? 'opacity-75 cursor-not-allowed' : ''
                      }`}
                      disabled={isWritePending || isWaitingForTx}
                    >
                      {isWritePending || isWaitingForTx ? (
                        <>
                          <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          Processing...
                        </>
                      ) : (
                        <>
                          <UserMinus className="h-5 w-5 mr-2" />
                          Remove Super Admin
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Transaction Status */}
        {(isWritePending || isWaitingForTx) && (
          <div className="mt-6 bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                  <ArrowRight className="h-4 w-4 text-blue-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">Transaction Status</h3>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <div className="h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-3"></div>
                  <div>
                    <p className="text-blue-700">
                      {isWritePending ? 'Waiting for confirmation...' : 'Transaction confirmed, waiting for receipt...'}
                    </p>
                    {writeData && (
                      <a
                        href={`${process.env.NEXT_PUBLIC_EXPLORER_URL}/tx/${writeData}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline text-sm flex items-center mt-1"
                      >
                        View on Explorer <ArrowRight className="h-3 w-3 ml-1" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Transaction Success */}
        {txReceipt && (
          <div className="mt-6 bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                  <Check className="h-4 w-4 text-green-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">Transaction Completed</h3>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-green-700 mb-2">
                  Transaction was successfully processed!
                </p>
                <a
                  href={`${process.env.NEXT_PUBLIC_EXPLORER_URL}/tx/${txReceipt.transactionHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-600 hover:underline text-sm flex items-center"
                >
                  View Transaction Details <ArrowRight className="h-3 w-3 ml-1" />
                </a>
              </div>
            </div>
          </div>
        )}
        
        {/* Back to Explorer */}
        <div className="mt-8 flex justify-center">
          <button
            onClick={() => router.push('/contract-explorer')}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors flex items-center"
          >
            Back to Contract Explorer
          </button>
        </div>
      </div>
    </div>
  );
}