import { contractABI } from '@/abi/seas4ABI';

export const useSovereignSeasContract = (address: `0x${string}`) => {
  return {
    address,
    abi: contractABI,
  };
}; 