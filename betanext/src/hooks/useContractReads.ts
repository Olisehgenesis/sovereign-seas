import { useReadContract, useReadContracts } from 'wagmi'
import type { Address, Abi } from 'viem'
import { contractABI as abi } from '@/abi/seas4ABI'

// Example of reading a single contract value
export function useSingleContractRead(contractAddress: Address) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getProjectCount', // Example function
    query: {
      enabled: !!contractAddress
    }
  })

  return {
    data,
    isLoading,
    error,
    refetch
  }
}

// Example of reading multiple contract values in parallel
export function useMultipleContractReads(contractAddress: Address, projectIds: bigint[]) {
  const contracts = projectIds.map(id => ({
    address: contractAddress,
    abi,
    functionName: 'getProject',
    args: [id]
  }))

  const { data, isLoading, error, refetch } = useReadContracts({
    contracts: contracts as unknown as readonly {
      address: Address
      abi: Abi
      functionName: string
      args: readonly [bigint]
    }[],
    query: {
      enabled: !!contractAddress && projectIds.length > 0
    }
  })

  return {
    data,
    isLoading,
    error,
    refetch
  }
}

// Example of reading contract data with arguments
export function useContractReadWithArgs(
  contractAddress: Address,
  functionName: string,
  args: readonly unknown[]
) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName,
    args,
    query: {
      enabled: !!contractAddress && !!functionName
    }
  })

  return {
    data,
    isLoading,
    error,
    refetch
  }
} 