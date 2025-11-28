// @ts-nocheck

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { 
  Shield, 
  Settings, 
  DollarSign, 
  Coins, 
  AlertTriangle,
  Loader2,
  CheckCircle,
  XCircle,
  Info,
  Users,
  Database,
  Zap,
  RefreshCw,
  Plus,
  Minus,
  Edit,
  Trash2,
  Eye,
  Download,
  Upload
} from 'lucide-react';

import { 
  useIsSuperAdmin,
  useAddSuperAdmin,
  useRemoveSuperAdmin,
  useUpdateBroker,
  useSetBypassSecretCode,
  useUpdateFeeAmounts,
  useGetBroker,
  useGetFeeAmounts,
  useGetCollectedFees,
  useWithdrawFees,
  useGetSupportedTokens,
  useAddSupportedToken,
  useRemoveSupportedToken,
  useSetTokenExchangeProvider,
  useUpdateTokenExchangeProvider,
  useDeactivateTokenExchangeProvider,
  useGetTokenExchangeProvider,
  useAdminForceConvertTokens,
  useEmergencyTokenRecovery,
  useUpdateDataStructureVersion,
  useGetDataStructureVersion
} from '@/hooks/useSuperAdminMethods';

import { formatEther } from 'viem';

export default function BackofficePage() {
  const { address, isConnected } = useAccount();
  const [isMounted, setIsMounted] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [statusMessage, setStatusMessage] = useState({ text: '', type: '' });
  
  // Modal states
  const [showAddSuperAdminModal, setShowAddSuperAdminModal] = useState(false);
  const [showRemoveSuperAdminModal, setShowRemoveSuperAdminModal] = useState(false);
  const [showUpdateBrokerModal, setShowUpdateBrokerModal] = useState(false);
  const [showSetBypassModal, setShowSetBypassModal] = useState(false);
  const [showUpdateFeesModal, setShowUpdateFeesModal] = useState(false);
  const [showAddTokenModal, setShowAddTokenModal] = useState(false);
  const [showRemoveTokenModal, setShowRemoveTokenModal] = useState(false);
  const [showSetProviderModal, setShowSetProviderModal] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  
  // Form states
  const [newSuperAdmin, setNewSuperAdmin] = useState('');
  const [removeSuperAdminAddress, setRemoveSuperAdminAddress] = useState('');
  const [newBroker, setNewBroker] = useState('');
  const [bypassCode, setBypassCode] = useState('');
  const [campaignFee, setCampaignFee] = useState('');
  const [projectFee, setProjectFee] = useState('');
  const [newToken, setNewToken] = useState('');
  const [removeToken, setRemoveToken] = useState('');
  const [providerToken, setProviderToken] = useState('');
  const [providerAddress, setProviderAddress] = useState('');
  const [exchangeId, setExchangeId] = useState('');
  const [emergencyToken, setEmergencyToken] = useState('');
  const [emergencyRecipient, setEmergencyRecipient] = useState('');
  const [emergencyAmount, setEmergencyAmount] = useState('');
  const [forceRecovery, setForceRecovery] = useState(false);

  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_V4;
  
  // Super admin check
  const { isSuperAdmin, isLoading: superAdminLoading } = useIsSuperAdmin(
    contractAddress as `0x${string}`, 
    address as `0x${string}`
  );

  // Data hooks
  const { broker, isLoading: brokerLoading } = useGetBroker(contractAddress as `0x${string}`);
  const { campaignCreationFee, projectAdditionFee, isLoading: feesLoading } = useGetFeeAmounts(contractAddress as `0x${string}`);
  const { supportedTokens, isLoading: tokensLoading } = useGetSupportedTokens(contractAddress as `0x${string}`);

  // Action hooks
  const { addSuperAdmin, isPending: addingSuperAdmin } = useAddSuperAdmin(contractAddress as `0x${string}`);
  const { removeSuperAdmin: removeSuperAdminFn, isPending: removingSuperAdmin } = useRemoveSuperAdmin(contractAddress as `0x${string}`);
  const { updateBroker, isPending: updatingBroker } = useUpdateBroker(contractAddress as `0x${string}`);
  const { setBypassSecretCode, isPending: settingBypass } = useSetBypassSecretCode(contractAddress as `0x${string}`);
  const { updateFeeAmounts, isPending: updatingFees } = useUpdateFeeAmounts(contractAddress as `0x${string}`);
  const { addSupportedToken, isPending: addingToken } = useAddSupportedToken(contractAddress as `0x${string}`);
  const { removeSupportedToken, isPending: removingToken } = useRemoveSupportedToken(contractAddress as `0x${string}`);
  const { setTokenExchangeProvider, isPending: settingProvider } = useSetTokenExchangeProvider(contractAddress as `0x${string}`);
  const { emergencyTokenRecovery, isPending: emergencyRecovery } = useEmergencyTokenRecovery(contractAddress as `0x${string}`);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (statusMessage.text) {
      const timer = setTimeout(() => {
        setStatusMessage({ text: '', type: '' });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [statusMessage]);

  const showStatusMessage = (text: string, type: 'success' | 'error' | 'info') => {
    setStatusMessage({ text, type });
  };

  // Event handlers
  const handleAddSuperAdmin = async () => {
    if (!newSuperAdmin) return;
    
    try {
      await addSuperAdmin(newSuperAdmin as `0x${string}`);
      showStatusMessage('Super admin added successfully!', 'success');
      setShowAddSuperAdminModal(false);
      setNewSuperAdmin('');
    } catch (error: any) {
      showStatusMessage(`Failed to add super admin: ${error.message || 'Unknown error'}`, 'error');
    }
  };

  const handleRemoveSuperAdmin = async () => {
    if (!removeSuperAdminAddress) return;
    
    try {
      await removeSuperAdminFn(removeSuperAdminAddress as `0x${string}`);
      showStatusMessage('Super admin removed successfully!', 'success');
      setShowRemoveSuperAdminModal(false);
      setRemoveSuperAdminAddress('');
    } catch (error: any) {
      showStatusMessage(`Failed to remove super admin: ${error.message || 'Unknown error'}`, 'error');
    }
  };

  const handleUpdateBroker = async () => {
    if (!newBroker) return;
    
    try {
      await updateBroker(newBroker as `0x${string}`);
      showStatusMessage('Broker updated successfully!', 'success');
      setShowUpdateBrokerModal(false);
      setNewBroker('');
    } catch (error: any) {
      showStatusMessage(`Failed to update broker: ${error.message || 'Unknown error'}`, 'error');
    }
  };

  const handleSetBypassCode = async () => {
    if (!bypassCode) return;
    
    try {
      await setBypassSecretCode(bypassCode);
      showStatusMessage('Bypass secret code set successfully!', 'success');
      setShowSetBypassModal(false);
      setBypassCode('');
    } catch (error: any) {
      showStatusMessage(`Failed to set bypass code: ${error.message || 'Unknown error'}`, 'error');
    }
  };

  const handleUpdateFees = async () => {
    if (!campaignFee || !projectFee) return;
    
    try {
      await updateFeeAmounts(
        BigInt(parseFloat(campaignFee) * 1e18),
        BigInt(parseFloat(projectFee) * 1e18)
      );
      showStatusMessage('Fee amounts updated successfully!', 'success');
      setShowUpdateFeesModal(false);
      setCampaignFee('');
      setProjectFee('');
    } catch (error: any) {
      showStatusMessage(`Failed to update fees: ${error.message || 'Unknown error'}`, 'error');
    }
  };

  const handleAddToken = async () => {
    if (!newToken) return;
    
    try {
      await addSupportedToken(newToken as `0x${string}`);
      showStatusMessage('Token added successfully!', 'success');
      setShowAddTokenModal(false);
      setNewToken('');
    } catch (error: any) {
      showStatusMessage(`Failed to add token: ${error.message || 'Unknown error'}`, 'error');
    }
  };

  const handleRemoveToken = async () => {
    if (!removeToken) return;
    
    try {
      await removeSupportedToken(removeToken as `0x${string}`);
      showStatusMessage('Token removed successfully!', 'success');
      setShowRemoveTokenModal(false);
      setRemoveToken('');
    } catch (error: any) {
      showStatusMessage(`Failed to remove token: ${error.message || 'Unknown error'}`, 'error');
    }
  };

  const handleSetProvider = async () => {
    if (!providerToken || !providerAddress || !exchangeId) return;
    
    try {
      await setTokenExchangeProvider(
        providerToken as `0x${string}`,
        providerAddress as `0x${string}`,
        exchangeId
      );
      showStatusMessage('Token exchange provider set successfully!', 'success');
      setShowSetProviderModal(false);
      setProviderToken('');
      setProviderAddress('');
      setExchangeId('');
    } catch (error: any) {
      showStatusMessage(`Failed to set provider: ${error.message || 'Unknown error'}`, 'error');
    }
  };

  const handleEmergencyRecovery = async () => {
    if (!emergencyToken || !emergencyRecipient) return;
    
    try {
      await emergencyTokenRecovery(
        emergencyToken as `0x${string}`,
        emergencyRecipient as `0x${string}`,
        emergencyAmount ? BigInt(parseFloat(emergencyAmount) * 1e18) : 0n,
        forceRecovery
      );
      showStatusMessage('Emergency token recovery completed!', 'success');
      setShowEmergencyModal(false);
      setEmergencyToken('');
      setEmergencyRecipient('');
      setEmergencyAmount('');
      setForceRecovery(false);
    } catch (error: any) {
      showStatusMessage(`Failed to recover tokens: ${error.message || 'Unknown error'}`, 'error');
    }
  };

  if (!isMounted) return null;

  if (superAdminLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-red-50 to-orange-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-6">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-red-200 rounded-full animate-spin border-t-red-600"></div>
            <Shield className="h-6 w-6 text-red-600 absolute inset-0 m-auto" />
          </div>
          <div className="text-center">
            <p className="text-xl text-slate-700 font-semibold">Loading Backoffice</p>
            <p className="text-sm text-slate-500 mt-2">Verifying super admin access...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isConnected || !isSuperAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-red-50 to-orange-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <Shield className="h-20 w-20 text-red-500 mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-slate-800 mb-4">Access Denied</h1>
          <p className="text-slate-600 mb-8">You need super admin privileges to access the backoffice.</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Shield },
    { id: 'admins', label: 'Super Admins', icon: Users },
    { id: 'tokens', label: 'Token Management', icon: Coins },
    { id: 'fees', label: 'Fee Management', icon: DollarSign },
    { id: 'system', label: 'System Config', icon: Settings },
    { id: 'emergency', label: 'Emergency', icon: AlertTriangle }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-red-50 to-orange-50">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-lg bg-red-600 flex items-center justify-center">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Backoffice</h1>
              <p className="text-sm text-slate-500">Super Admin Control Panel</p>
            </div>
          </div>
        </div>

        {/* Status Message */}
        {statusMessage.text && (
          <div className={`mb-6 p-4 rounded-lg border ${
            statusMessage.type === 'success' 
              ? 'bg-green-50 border-green-200 text-green-700' 
              : statusMessage.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-700'
              : 'bg-blue-50 border-blue-200 text-blue-700'
          }`}>
            <div className="flex items-start">
              {statusMessage.type === 'success' ? (
                <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
              ) : statusMessage.type === 'error' ? (
                <XCircle className="h-5 w-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
              ) : (
                <Info className="h-5 w-5 text-blue-500 mr-3 flex-shrink-0 mt-0.5" />
              )}
              <p className="font-medium">{statusMessage.text}</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-8">
          <div className="border-b border-slate-200">
            <nav className="flex space-x-8 px-6">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 border-b-2 font-medium text-sm transition-colors duration-200 ${
                    activeTab === tab.id
                      ? 'border-red-500 text-red-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-xl p-6 border border-red-100">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">System Status</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Contract:</span>
                      <span className="font-mono text-xs text-slate-800">{contractAddress?.slice(0, 10)}...</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Current Broker:</span>
                      <span className="font-mono text-xs text-slate-800">{broker?.slice(0, 10)}...</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Supported Tokens:</span>
                      <span className="font-semibold text-red-600">{supportedTokens?.length || 0}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Fee Configuration</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Campaign Fee:</span>
                      <span className="font-semibold text-blue-600">
                        {campaignCreationFee ? Number(formatEther(campaignCreationFee)) : '0'} CELO
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Project Fee:</span>
                      <span className="font-semibold text-blue-600">
                        {projectAdditionFee ? Number(formatEther(projectAdditionFee)) : '0'} CELO
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Quick Actions</h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => setShowAddSuperAdminModal(true)}
                      className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors duration-200"
                    >
                      Add Super Admin
                    </button>
                    <button
                      onClick={() => setShowUpdateFeesModal(true)}
                      className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors duration-200"
                    >
                      Update Fees
                    </button>
                    <button
                      onClick={() => setShowAddTokenModal(true)}
                      className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors duration-200"
                    >
                      Add Token
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Super Admins Tab */}
            {activeTab === 'admins' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-slate-800">Super Admin Management</h3>
                  <button
                    onClick={() => setShowAddSuperAdminModal(true)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200 flex items-center space-x-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Super Admin</span>
                  </button>
                </div>
                
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <p className="text-slate-600">Super admin management interface would go here. This would include listing current super admins and their permissions.</p>
                </div>
              </div>
            )}

            {/* Token Management Tab */}
            {activeTab === 'tokens' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-slate-800">Token Management</h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setShowAddTokenModal(true)}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors duration-200 flex items-center space-x-2"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add Token</span>
                    </button>
                    <button
                      onClick={() => setShowRemoveTokenModal(true)}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200 flex items-center space-x-2"
                    >
                      <Minus className="h-4 w-4" />
                      <span>Remove Token</span>
                    </button>
                    <button
                      onClick={() => setShowSetProviderModal(true)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 flex items-center space-x-2"
                    >
                      <Settings className="h-4 w-4" />
                      <span>Set Provider</span>
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h4 className="font-semibold text-slate-800 mb-4">Supported Tokens</h4>
                  <div className="space-y-2">
                    {supportedTokens?.map((token, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <span className="font-mono text-sm text-slate-800">{token}</span>
                        <div className="flex space-x-2">
                          <button className="p-1 text-blue-600 hover:text-blue-700">
                            <Eye className="h-4 w-4" />
                          </button>
                          <button className="p-1 text-red-600 hover:text-red-700">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Fee Management Tab */}
            {activeTab === 'fees' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-slate-800">Fee Management</h3>
                  <button
                    onClick={() => setShowUpdateFeesModal(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 flex items-center space-x-2"
                  >
                    <Edit className="h-4 w-4" />
                    <span>Update Fees</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h4 className="font-semibold text-slate-800 mb-4">Current Fees</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Campaign Creation:</span>
                        <span className="font-semibold text-blue-600">
                          {campaignCreationFee ? Number(formatEther(campaignCreationFee)) : '0'} CELO
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Project Addition:</span>
                        <span className="font-semibold text-blue-600">
                          {projectAdditionFee ? Number(formatEther(projectAdditionFee)) : '0'} CELO
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h4 className="font-semibold text-slate-800 mb-4">Fee Collection</h4>
                    <p className="text-slate-600 text-sm">Fee collection and withdrawal interface would go here.</p>
                  </div>
                </div>
              </div>
            )}

            {/* System Config Tab */}
            {activeTab === 'system' && (
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-slate-800">System Configuration</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h4 className="font-semibold text-slate-800 mb-4">Broker Configuration</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Current Broker:</span>
                        <span className="font-mono text-xs text-slate-800">{broker?.slice(0, 20)}...</span>
                      </div>
                      <button
                        onClick={() => setShowUpdateBrokerModal(true)}
                        className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors duration-200"
                      >
                        Update Broker
                      </button>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h4 className="font-semibold text-slate-800 mb-4">Security Settings</h4>
                    <div className="space-y-3">
                      <button
                        onClick={() => setShowSetBypassModal(true)}
                        className="w-full px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm transition-colors duration-200"
                      >
                        Set Bypass Code
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Emergency Tab */}
            {activeTab === 'emergency' && (
              <div className="space-y-6">
                <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                  <div className="flex items-start">
                    <AlertTriangle className="h-6 w-6 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-lg font-semibold text-red-800 mb-2">Emergency Controls</h3>
                      <p className="text-red-700 text-sm">
                        These functions should only be used in emergency situations. They can have irreversible effects on the system.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h4 className="font-semibold text-slate-800 mb-4">Token Recovery</h4>
                  <button
                    onClick={() => setShowEmergencyModal(true)}
                    className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200 flex items-center space-x-2"
                  >
                    <AlertTriangle className="h-4 w-4" />
                    <span>Emergency Token Recovery</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modals */}
        {/* Add Super Admin Modal */}
        {showAddSuperAdminModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-slate-800">Add Super Admin</h3>
                <button
                  onClick={() => setShowAddSuperAdminModal(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Wallet Address</label>
                  <input
                    type="text"
                    value={newSuperAdmin}
                    onChange={(e) => setNewSuperAdmin(e.target.value)}
                    placeholder="0x..."
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                  />
                </div>
                
                <div className="flex space-x-4">
                  <button
                    onClick={handleAddSuperAdmin}
                    disabled={addingSuperAdmin || !newSuperAdmin}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200 disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    {addingSuperAdmin ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    <span>Add Super Admin</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      setShowAddSuperAdminModal(false);
                      setNewSuperAdmin('');
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Update Fees Modal */}
        {showUpdateFeesModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-slate-800">Update Fee Amounts</h3>
                <button
                  onClick={() => setShowUpdateFeesModal(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Campaign Creation Fee (CELO)</label>
                  <input
                    type="number"
                    value={campaignFee}
                    onChange={(e) => setCampaignFee(e.target.value)}
                    placeholder="2.0"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Project Addition Fee (CELO)</label>
                  <input
                    type="number"
                    value={projectFee}
                    onChange={(e) => setProjectFee(e.target.value)}
                    placeholder="1.0"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>
                
                <div className="flex space-x-4">
                  <button
                    onClick={handleUpdateFees}
                    disabled={updatingFees || !campaignFee || !projectFee}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    {updatingFees ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Edit className="h-4 w-4" />
                    )}
                    <span>Update Fees</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      setShowUpdateFeesModal(false);
                      setCampaignFee('');
                      setProjectFee('');
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Token Modal */}
        {showAddTokenModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-slate-800">Add Supported Token</h3>
                <button
                  onClick={() => setShowAddTokenModal(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Token Contract Address</label>
                  <input
                    type="text"
                    value={newToken}
                    onChange={(e) => setNewToken(e.target.value)}
                    placeholder="0x..."
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                  />
                </div>
                
                <div className="flex space-x-4">
                  <button
                    onClick={handleAddToken}
                    disabled={addingToken || !newToken}
                    className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors duration-200 disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    {addingToken ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    <span>Add Token</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      setShowAddTokenModal(false);
                      setNewToken('');
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Emergency Recovery Modal */}
        {showEmergencyModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-lg p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-slate-800">Emergency Token Recovery</h3>
                <button
                  onClick={() => setShowEmergencyModal(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-red-800">Warning</p>
                      <p className="text-sm text-red-700 mt-1">
                        This action is irreversible and should only be used in emergency situations.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Token Address</label>
                    <input
                      type="text"
                      value={emergencyToken}
                      onChange={(e) => setEmergencyToken(e.target.value)}
                      placeholder="0x..."
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Recipient Address</label>
                    <input
                      type="text"
                      value={emergencyRecipient}
                      onChange={(e) => setEmergencyRecipient(e.target.value)}
                      placeholder="0x..."
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Amount (leave empty for all)</label>
                    <input
                      type="number"
                      value={emergencyAmount}
                      onChange={(e) => setEmergencyAmount(e.target.value)}
                      placeholder="0.0"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="forceRecovery"
                      checked={forceRecovery}
                      onChange={(e) => setForceRecovery(e.target.checked)}
                      className="rounded border-slate-300 text-red-600 focus:ring-red-500"
                    />
                    <label htmlFor="forceRecovery" className="text-sm text-slate-700">
                      Force recovery (ignore active campaigns)
                    </label>
                  </div>
                </div>
                
                <div className="flex space-x-4">
                  <button
                    onClick={handleEmergencyRecovery}
                    disabled={emergencyRecovery || !emergencyToken || !emergencyRecipient}
                    className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200 disabled:opacity-50 flex items-center justify-center space-x-2 font-medium"
                  >
                    {emergencyRecovery ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <AlertTriangle className="h-4 w-4" />
                    )}
                    <span>Recover Tokens</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      setShowEmergencyModal(false);
                      setEmergencyToken('');
                      setEmergencyRecipient('');
                      setEmergencyAmount('');
                      setForceRecovery(false);
                    }}
                    className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors duration-200 font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
