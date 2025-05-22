import React, { useState, useEffect } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { Monitor, RefreshCw, AlertCircle, CheckCircle, XCircle, Eye } from 'lucide-react';

export const TransactionDebugger = ({ isEnabled = false }) => {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const [debugInfo, setDebugInfo] = useState({});
  const [isExpanded, setIsExpanded] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const collectDebugInfo = async () => {
    if (!isConnected || !address) return;

    try {
      const blockNumber = await publicClient.getBlockNumber();
      const balance = await publicClient.getBalance({ address });
      const nonce = await publicClient.getTransactionCount({ address });
      const gasPrice = await publicClient.getGasPrice();
      const chainId = await publicClient.getChainId();

      setDebugInfo({
        timestamp: new Date().toISOString(),
        wallet: {
          address,
          balance: balance.toString(),
          nonce: nonce.toString(),
          isConnected
        },
        network: {
          chainId: chainId.toString(),
          blockNumber: blockNumber.toString(),
          gasPrice: gasPrice.toString()
        },
        contract: {
          address: process.env.NEXT_PUBLIC_CONTRACT_V4,
          isValidAddress: process.env.NEXT_PUBLIC_CONTRACT_V4?.startsWith('0x')
        }
      });
    } catch (error) {
      console.error('Debug info collection failed:', error);
      setDebugInfo({
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  };

  useEffect(() => {
    if (isEnabled && isConnected) {
      collectDebugInfo();
    }
  }, [isEnabled, isConnected]);

  useEffect(() => {
    let interval;
    if (autoRefresh && isEnabled) {
      interval = setInterval(collectDebugInfo, 10000); // Refresh every 10 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, isEnabled]);

  if (!isEnabled) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className={`bg-white border border-gray-300 rounded-lg shadow-lg transition-all duration-300 ${
        isExpanded ? 'w-96 h-auto' : 'w-12 h-12'
      }`}>
        {!isExpanded ? (
          <button
            onClick={() => setIsExpanded(true)}
            className="w-full h-full flex items-center justify-center text-gray-600 hover:text-gray-800"
          >
            <Monitor className="h-5 w-5" />
          </button>
        ) : (
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800 flex items-center">
                <Monitor className="h-4 w-4 mr-2" />
                Debug Info
              </h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={`p-1 rounded ${autoRefresh ? 'text-green-600' : 'text-gray-400'}`}
                  title="Auto refresh"
                >
                  <RefreshCw className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={collectDebugInfo}
                  className="p-1 text-blue-600 hover:text-blue-800"
                  title="Refresh now"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              {/* Wallet Status */}
              <div className="border rounded p-2">
                <div className="flex items-center mb-1">
                  <div className={`w-2 h-2 rounded-full mr-2 ${
                    debugInfo.wallet?.isConnected ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  <span className="font-medium">Wallet</span>
                </div>
                {debugInfo.wallet && (
                  <div className="space-y-1 text-gray-600">
                    <div>Address: {debugInfo.wallet.address?.slice(0, 6)}...{debugInfo.wallet.address?.slice(-4)}</div>
                    <div>Balance: {parseFloat(debugInfo.wallet.balance) / 1e18} ETH</div>
                    <div>Nonce: {debugInfo.wallet.nonce}</div>
                  </div>
                )}
              </div>

              {/* Network Status */}
              <div className="border rounded p-2">
                <div className="flex items-center mb-1">
                  <div className={`w-2 h-2 rounded-full mr-2 ${
                    debugInfo.network?.chainId === '42220' ? 'bg-green-500' : 'bg-yellow-500'
                  }`} />
                  <span className="font-medium">Network</span>
                </div>
                {debugInfo.network && (
                  <div className="space-y-1 text-gray-600">
                    <div>Chain ID: {debugInfo.network.chainId}</div>
                    <div>Block: {debugInfo.network.blockNumber}</div>
                    <div>Gas Price: {parseInt(debugInfo.network.gasPrice) / 1e9} Gwei</div>
                  </div>
                )}
              </div>

              {/* Contract Status */}
              <div className="border rounded p-2">
                <div className="flex items-center mb-1">
                  <div className={`w-2 h-2 rounded-full mr-2 ${
                    debugInfo.contract?.isValidAddress ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  <span className="font-medium">Contract</span>
                </div>
                {debugInfo.contract && (
                  <div className="space-y-1 text-gray-600">
                    <div>Address: {debugInfo.contract.address?.slice(0, 6)}...{debugInfo.contract.address?.slice(-4)}</div>
                    <div>Valid: {debugInfo.contract.isValidAddress ? 'Yes' : 'No'}</div>
                  </div>
                )}
              </div>

              {/* Error Display */}
              {debugInfo.error && (
                <div className="border border-red-200 bg-red-50 rounded p-2">
                  <div className="flex items-center mb-1">
                    <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                    <span className="font-medium text-red-700">Error</span>
                  </div>
                  <div className="text-red-600">{debugInfo.error}</div>
                </div>
              )}

              {/* Timestamp */}
              {debugInfo.timestamp && (
                <div className="text-gray-400 text-center">
                  Last updated: {new Date(debugInfo.timestamp).toLocaleTimeString()}
                </div>
              )}
            </div>

            {/* Export Debug Info */}
            <button
              onClick={() => {
                const dataStr = JSON.stringify(debugInfo, null, 2);
                const dataBlob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(dataBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `debug-info-${Date.now()}.json`;
                link.click();
                URL.revokeObjectURL(url);
              }}
              className="w-full mt-3 px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors flex items-center justify-center"
            >
              <Eye className="h-3 w-3 mr-1" />
              Export Debug Data
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Transaction Status Monitor
export const TransactionStatusMonitor = ({ hash, onComplete }) => {
  const publicClient = usePublicClient();
  const [status, setStatus] = useState('pending');
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!hash) return;

    const checkTransaction = async () => {
      try {
        console.log('🔍 Checking transaction status:', hash);
        
        const txReceipt = await publicClient.waitForTransactionReceipt({
          hash,
          timeout: 60000 // 60 seconds timeout
        });

        console.log('📄 Transaction receipt:', txReceipt);
        setReceipt(txReceipt);
        setStatus(txReceipt.status === 'success' ? 'success' : 'failed');
        
        if (onComplete) {
          onComplete(txReceipt);
        }
      } catch (err) {
        console.error('❌ Transaction check failed:', err);
        setError(err.message);
        setStatus('failed');
      }
    };

    checkTransaction();
  }, [hash, publicClient, onComplete]);

  if (!hash) return null;

  return (
    <div className="bg-white border rounded-lg p-4 mb-4">
      <div className="flex items-center mb-2">
        {status === 'pending' && <RefreshCw className="h-5 w-5 text-blue-500 animate-spin mr-2" />}
        {status === 'success' && <CheckCircle className="h-5 w-5 text-green-500 mr-2" />}
        {status === 'failed' && <XCircle className="h-5 w-5 text-red-500 mr-2" />}
        <span className="font-medium">
          Transaction {status === 'pending' ? 'Pending' : status === 'success' ? 'Successful' : 'Failed'}
        </span>
      </div>
      
      <div className="text-sm text-gray-600 space-y-1">
        <div>Hash: {hash.slice(0, 10)}...{hash.slice(-8)}</div>
        {receipt && (
          <>
            <div>Block: {receipt.blockNumber.toString()}</div>
            <div>Gas Used: {receipt.gasUsed.toString()}</div>
            {receipt.logs && <div>Events: {receipt.logs.length}</div>}
          </>
        )}
        {error && <div className="text-red-600">Error: {error}</div>}
      </div>
      
      <a
        href={`https://celoscan.io/tx/${hash}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center mt-2 text-blue-600 hover:text-blue-800 text-sm"
      >
        View on Celoscan
        <ExternalLink className="h-3 w-3 ml-1" />
      </a>
    </div>
  );
};