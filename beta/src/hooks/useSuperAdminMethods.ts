// hooks/useSuperAdminMethods.ts

import { useReadContract, useWriteContract, useReadContracts } from 'wagmi';
import type { Address } from 'viem';
import { contractABI as abi } from '@/abi/seas4ABI';

// Super Admin Management Hooks

// Hook to check if user is super admin
export function useIsSuperAdmin(contractAddress: Address, userAddress?: Address) {
  const { data: isSuperAdmin, isLoading, error } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'superAdmins',
    args: [userAddress as Address],
    query: {
      enabled: !!contractAddress && !!userAddress
    }
  });

  return {
    isSuperAdmin: isSuperAdmin as boolean,
    isLoading,
    error
  };
}

// Hook to add super admin
export function useAddSuperAdmin(contractAddress: Address) {
  const { writeContract, isPending, isError, error, isSuccess } = useWriteContract();

  const addSuperAdmin = async (newAdmin: Address) => {
    try {
      await writeContract({
        address: contractAddress,
        abi,
        functionName: 'addSuperAdmin',
        args: [newAdmin]
      });
    } catch (err) {
      console.error('Error adding super admin:', err);
      throw err;
    }
  };

  return {
    addSuperAdmin,
    isPending,
    isError,
    error,
    isSuccess
  };
}

// Hook to remove super admin
export function useRemoveSuperAdmin(contractAddress: Address) {
  const { writeContract, isPending, isError, error, isSuccess } = useWriteContract();

  const removeSuperAdmin = async (superAdmin: Address) => {
    try {
      await writeContract({
        address: contractAddress,
        abi,
        functionName: 'removeSuperAdmin',
        args: [superAdmin]
      });
    } catch (err) {
      console.error('Error removing super admin:', err);
      throw err;
    }
  };

  return {
    removeSuperAdmin,
    isPending,
    isError,
    error,
    isSuccess
  };
}

// Hook to update broker
export function useUpdateBroker(contractAddress: Address) {
  const { writeContract, isPending, isError, error, isSuccess } = useWriteContract();

  const updateBroker = async (newBroker: Address) => {
    try {
      await writeContract({
        address: contractAddress,
        abi,
        functionName: 'updateBroker',
        args: [newBroker]
      });
    } catch (err) {
      console.error('Error updating broker:', err);
      throw err;
    }
  };

  return {
    updateBroker,
    isPending,
    isError,
    error,
    isSuccess
  };
}

// Hook to set bypass secret code
export function useSetBypassSecretCode(contractAddress: Address) {
  const { writeContract, isPending, isError, error, isSuccess } = useWriteContract();

  const setBypassSecretCode = async (secretCode: string) => {
    try {
      // Convert string to bytes32
      const bytes32Code = `0x${secretCode.padEnd(64, '0')}`;
      await writeContract({
        address: contractAddress,
        abi,
        functionName: 'setBypassSecretCode',
        args: [bytes32Code as `0x${string}`]
      });
    } catch (err) {
      console.error('Error setting bypass secret code:', err);
      throw err;
    }
  };

  return {
    setBypassSecretCode,
    isPending,
    isError,
    error,
    isSuccess
  };
}

// Hook to update fee amounts
export function useUpdateFeeAmounts(contractAddress: Address) {
  const { writeContract, isPending, isError, error, isSuccess } = useWriteContract();

  const updateFeeAmounts = async (campaignFee: bigint, projectFee: bigint) => {
    try {
      await writeContract({
        address: contractAddress,
        abi,
        functionName: 'updateFeeAmounts',
        args: [campaignFee, projectFee]
      });
    } catch (err) {
      console.error('Error updating fee amounts:', err);
      throw err;
    }
  };

  return {
    updateFeeAmounts,
    isPending,
    isError,
    error,
    isSuccess
  };
}

// Hook to update data structure version
export function useUpdateDataStructureVersion(contractAddress: Address) {
  const { writeContract, isPending, isError, error, isSuccess } = useWriteContract();

  const updateDataStructureVersion = async (
    dataType: string, 
    newVersion: bigint, 
    structureDescription: string
  ) => {
    try {
      await writeContract({
        address: contractAddress,
        abi,
        functionName: 'updateDataStructureVersion',
        args: [dataType, newVersion, structureDescription]
      });
    } catch (err) {
      console.error('Error updating data structure version:', err);
      throw err;
    }
  };

  return {
    updateDataStructureVersion,
    isPending,
    isError,
    error,
    isSuccess
  };
}

// Hook to get current broker
export function useGetBroker(contractAddress: Address) {
  const { data: broker, isLoading, error } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'mentoTokenBroker',
    query: {
      enabled: !!contractAddress
    }
  });

  return {
    broker: broker as Address,
    isLoading,
    error
  };
}

// Hook to get fee amounts
export function useGetFeeAmounts(contractAddress: Address) {
  const contracts = [
    {
      address: contractAddress,
      abi,
      functionName: 'campaignCreationFee'
    },
    {
      address: contractAddress,
      abi,
      functionName: 'projectAdditionFee'
    }
  ];

  const { data, isLoading, error } = useReadContracts({
    contracts: contracts as any
  });

  return {
    campaignCreationFee: data?.[0]?.result as bigint,
    projectAdditionFee: data?.[1]?.result as bigint,
    isLoading,
    error
  };
}

// Hook to get collected fees
export function useGetCollectedFees(contractAddress: Address, token: Address) {
  const { data: collectedFees, isLoading, error } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'collectedFees',
    args: [token],
    query: {
      enabled: !!contractAddress && !!token
    }
  });

  return {
    collectedFees: collectedFees as bigint,
    isLoading,
    error
  };
}

// Hook to withdraw fees
export function useWithdrawFees(contractAddress: Address) {
  const { writeContract, isPending, isError, error, isSuccess } = useWriteContract();

  const withdrawFees = async (token: Address, recipient: Address, amount: bigint) => {
    try {
      await writeContract({
        address: contractAddress,
        abi,
        functionName: 'withdrawFees',
        args: [token, recipient, amount]
      });
    } catch (err) {
      console.error('Error withdrawing fees:', err);
      throw err;
    }
  };

  return {
    withdrawFees,
    isPending,
    isError,
    error,
    isSuccess
  };
}

// Hook to get supported tokens
export function useGetSupportedTokens(contractAddress: Address) {
  const { data: supportedTokens, isLoading, error } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getSupportedTokens',
    query: {
      enabled: !!contractAddress
    }
  });

  return {
    supportedTokens: supportedTokens as Address[],
    isLoading,
    error
  };
}

// Hook to add supported token
export function useAddSupportedToken(contractAddress: Address) {
  const { writeContract, isPending, isError, error, isSuccess } = useWriteContract();

  const addSupportedToken = async (token: Address) => {
    try {
      await writeContract({
        address: contractAddress,
        abi,
        functionName: 'addSupportedToken',
        args: [token]
      });
    } catch (err) {
      console.error('Error adding supported token:', err);
      throw err;
    }
  };

  return {
    addSupportedToken,
    isPending,
    isError,
    error,
    isSuccess
  };
}

// Hook to remove supported token
export function useRemoveSupportedToken(contractAddress: Address) {
  const { writeContract, isPending, isError, error, isSuccess } = useWriteContract();

  const removeSupportedToken = async (token: Address) => {
    try {
      await writeContract({
        address: contractAddress,
        abi,
        functionName: 'removeSupportedToken',
        args: [token]
      });
    } catch (err) {
      console.error('Error removing supported token:', err);
      throw err;
    }
  };

  return {
    removeSupportedToken,
    isPending,
    isError,
    error,
    isSuccess
  };
}

// Hook to set token exchange provider
export function useSetTokenExchangeProvider(contractAddress: Address) {
  const { writeContract, isPending, isError, error, isSuccess } = useWriteContract();

  const setTokenExchangeProvider = async (
    token: Address, 
    provider: Address, 
    exchangeId: string
  ) => {
    try {
      // Convert string to bytes32
      const bytes32ExchangeId = `0x${exchangeId.padEnd(64, '0')}`;
      await writeContract({
        address: contractAddress,
        abi,
        functionName: 'setTokenExchangeProvider',
        args: [token, provider, bytes32ExchangeId as `0x${string}`]
      });
    } catch (err) {
      console.error('Error setting token exchange provider:', err);
      throw err;
    }
  };

  return {
    setTokenExchangeProvider,
    isPending,
    isError,
    error,
    isSuccess
  };
}

// Hook to update token exchange provider
export function useUpdateTokenExchangeProvider(contractAddress: Address) {
  const { writeContract, isPending, isError, error, isSuccess } = useWriteContract();

  const updateTokenExchangeProvider = async (
    token: Address, 
    newProvider: Address, 
    newExchangeId: string
  ) => {
    try {
      // Convert string to bytes32
      const bytes32ExchangeId = `0x${newExchangeId.padEnd(64, '0')}`;
      await writeContract({
        address: contractAddress,
        abi,
        functionName: 'updateTokenExchangeProvider',
        args: [token, newProvider, bytes32ExchangeId as `0x${string}`]
      });
    } catch (err) {
      console.error('Error updating token exchange provider:', err);
      throw err;
    }
  };

  return {
    updateTokenExchangeProvider,
    isPending,
    isError,
    error,
    isSuccess
  };
}

// Hook to deactivate token exchange provider
export function useDeactivateTokenExchangeProvider(contractAddress: Address) {
  const { writeContract, isPending, isError, error, isSuccess } = useWriteContract();

  const deactivateTokenExchangeProvider = async (token: Address) => {
    try {
      await writeContract({
        address: contractAddress,
        abi,
        functionName: 'deactivateTokenExchangeProvider',
        args: [token]
      });
    } catch (err) {
      console.error('Error deactivating token exchange provider:', err);
      throw err;
    }
  };

  return {
    deactivateTokenExchangeProvider,
    isPending,
    isError,
    error,
    isSuccess
  };
}

// Hook to get token exchange provider
export function useGetTokenExchangeProvider(contractAddress: Address, token: Address) {
  const { data, isLoading, error } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getTokenExchangeProvider',
    args: [token],
    query: {
      enabled: !!contractAddress && !!token
    }
  });

  return {
    provider: (data as any)?.[0] as Address,
    exchangeId: (data as any)?.[1] as string,
    active: (data as any)?.[2] as boolean,
    isLoading,
    error
  };
}

// Hook to force convert tokens
export function useAdminForceConvertTokens(contractAddress: Address) {
  const { writeContract, isPending, isError, error, isSuccess } = useWriteContract();

  const adminForceConvertTokens = async (
    fromToken: Address, 
    toToken: Address, 
    amount: bigint
  ) => {
    try {
      await writeContract({
        address: contractAddress,
        abi,
        functionName: 'adminForceConvertTokens',
        args: [fromToken, toToken, amount]
      });
    } catch (err) {
      console.error('Error force converting tokens:', err);
      throw err;
    }
  };

  return {
    adminForceConvertTokens,
    isPending,
    isError,
    error,
    isSuccess
  };
}

// Hook to emergency token recovery
export function useEmergencyTokenRecovery(contractAddress: Address) {
  const { writeContract, isPending, isError, error, isSuccess } = useWriteContract();

  const emergencyTokenRecovery = async (
    token: Address, 
    recipient: Address, 
    amount: bigint, 
    forceRecovery: boolean
  ) => {
    try {
      await writeContract({
        address: contractAddress,
        abi,
        functionName: 'emergencyTokenRecovery',
        args: [token, recipient, amount, forceRecovery]
      });
    } catch (err) {
      console.error('Error emergency token recovery:', err);
      throw err;
    }
  };

  return {
    emergencyTokenRecovery,
    isPending,
    isError,
    error,
    isSuccess
  };
}

// Hook to get data structure version
export function useGetDataStructureVersion(contractAddress: Address, dataType: string) {
  const { data: version, isLoading, error } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getDataStructureVersion',
    args: [dataType],
    query: {
      enabled: !!contractAddress && !!dataType
    }
  });

  return {
    version: version as bigint,
    isLoading,
    error
  };
}
