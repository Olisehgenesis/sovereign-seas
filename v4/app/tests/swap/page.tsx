'use client';
import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { 
  usePublicClient, 
  useWalletClient, 
  useReadContract, 
  useWriteContract, 
  useWaitForTransactionReceipt 
} from 'wagmi';
import { parseEther, formatEther } from 'viem';

// Simplified page that just handles the swap functionality
const SimpleSwapPage = () => {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  
  // State variables
  const [amount, setAmount] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  
  // Contract addresses - replace these with your actual addresses
  const SWAPPER_ADDRESS = process.env.NEXT_PUBLIC_MENTO_SWAPPER_ADDRESS as `0x${string}` || '0xYourContractAddress';
  const CUSD_ADDRESS = process.env.NEXT_PUBLIC_CUSD_ADDRESS as `0x${string}` || '0x765DE816845861e75A25fCA122bb6898B8B1282a';
  
  // Simplified ABIs for the functions we need
  const ERC20_ABI = [
    {
      inputs: [
        { name: "spender", type: "address" },
        { name: "amount", type: "uint256" }
      ],
      name: "approve",
      outputs: [{ name: "", type: "bool" }],
      stateMutability: "nonpayable",
      type: "function"
    },
    {
      inputs: [
        { name: "owner", type: "address" },
        { name: "spender", type: "address" }
      ],
      name: "allowance",
      outputs: [{ name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function"
    }
  ];
  
  const SWAPPER_ABI = [
    {
      inputs: [
        { name: "_cusdAmount", type: "uint256" },
        { name: "_minCeloAmount", type: "uint256" }
      ],
      name: "swapCUSDtoCELO",
      outputs: [{ name: "celoAmount", type: "uint256" }],
      stateMutability: "nonpayable",
      type: "function"
    }
  ];
  
  // For writing to contracts
  const { 
    data: writeData, 
    writeContract, 
    isPending: isWritePending, 
    isSuccess: isWriteSuccess, 
    error: writeError,
    reset: resetWrite 
  } = useWriteContract();

  // For tracking transactions
  const { 
    data: txReceipt, 
    isLoading: isWaitingForTx, 
    isSuccess: isTxSuccess 
  } = useWaitForTransactionReceipt({
    hash: writeData,
  });
  
  // Handle amount change
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(e.target.value);
  };
  
  // Check if we need approval first
  const checkAllowance = async () => {
    if (!isConnected || !address || !amount || !publicClient) return false;
    
    try {
      const allowance = await publicClient.readContract({
        address: CUSD_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [address, SWAPPER_ADDRESS],
      }) as bigint;
      
      const amountWei = parseEther(amount);
      return allowance >= amountWei;
    } catch (error) {
      console.error('Error checking allowance:', error);
      return false;
    }
  };
  
  // Approve cUSD spending
  const handleApprove = async () => {
    if (!isConnected || !amount) {
      setStatus('Please connect your wallet and enter an amount');
      return;
    }
    
    try {
      setStatus('Approving cUSD...');
      
      writeContract({
        address: CUSD_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [SWAPPER_ADDRESS, parseEther(amount)],
      });
    } catch (error) {
      console.error('Approval error:', error);
      setStatus('Error approving cUSD');
    }
  };
  
  // Swap cUSD to CELO
  const handleSwap = async () => {
    if (!isConnected || !amount) {
      setStatus('Please connect your wallet and enter an amount');
      return;
    }
    
    // Check if we need approval first
    const hasAllowance = await checkAllowance();
    if (!hasAllowance) {
      setStatus('Please approve cUSD first');
      return;
    }
    
    try {
      setStatus('Swapping cUSD to CELO...');
      
      // Use a minimum amount that's 95% of the input (5% slippage)
      const amountWei = parseEther(amount);
      const minCeloAmount = amountWei * BigInt(95) / BigInt(100);
      
      writeContract({
        address: SWAPPER_ADDRESS,
        abi: SWAPPER_ABI,
        functionName: 'swapCUSDtoCELO',
        args: [amountWei, minCeloAmount],
      });
    } catch (error) {
      console.error('Swap error:', error);
      setStatus('Error swapping cUSD to CELO');
    }
  };
  
  // Handle transaction status updates
  useEffect(() => {
    if (isWritePending) {
      setStatus('Transaction pending...');
    } else if (isWaitingForTx) {
      setStatus('Waiting for transaction confirmation...');
    } else if (isTxSuccess) {
      setStatus('Transaction successful!');
      setAmount('');
    } else if (writeError) {
      setStatus(`Error: ${writeError.message}`);
    }
  }, [isWritePending, isWaitingForTx, isTxSuccess, writeError]);
  
  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-4">cUSD to CELO Swap</h1>
      
      {!isConnected ? (
        <div className="text-center py-8">
          <p className="mb-4">Please connect your wallet to continue</p>
          {/* Your connect wallet button would go here */}
        </div>
      ) : (
        <>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              cUSD Amount
            </label>
            <input
              type="number"
              value={amount}
              onChange={handleAmountChange}
              placeholder="Enter amount to swap"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isWritePending || isWaitingForTx}
            />
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={handleApprove}
              className="flex-1 py-2 px-4 bg-yellow-500 hover:bg-yellow-600 text-white font-medium rounded-md transition duration-200"
              disabled={isWritePending || isWaitingForTx || !amount || Number(amount) <= 0}
            >
              {isWritePending || isWaitingForTx ? 'Processing...' : 'Approve cUSD'}
            </button>
            
            <button
              onClick={handleSwap}
              className="flex-1 py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-md transition duration-200"
              disabled={isWritePending || isWaitingForTx || !amount || Number(amount) <= 0}
            >
              {isWritePending || isWaitingForTx ? 'Processing...' : 'Swap to CELO'}
            </button>
          </div>
          
          {status && (
            <div className="mt-4 p-3 bg-gray-100 rounded-md text-center">
              {status}
            </div>
          )}
          
          <div className="mt-6 pt-4 border-t text-center text-gray-600 text-sm">
            Swapped CELO will remain in the contract
          </div>
        </>
      )}
    </div>
  );
};

export default SimpleSwapPage;