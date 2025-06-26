import { useReadContract } from 'wagmi'
import { formatEther, Address } from 'viem'
import { contractABI as abi } from '@/abi/seas4ABI'

export function useCeloFee(contractAddress: Address) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'PLATFORM_FEE',
    query: {
      enabled: !!contractAddress
    }
  })

  return {
    fee: data as bigint || 0n,
    feeFormatted: data ? formatEther(data as bigint) : '0',
    isLoading,
    error,
    refetch
  }
} 