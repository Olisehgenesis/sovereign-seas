// hooks/useTournamentMethods.ts

import { useReadContract, useWriteContract, useReadContracts, useAccount, useSendTransaction } from 'wagmi';
import { formatEther } from 'viem';
import type { Address, Abi } from 'viem';
import { useState, useEffect, useCallback } from 'react';
import { tournamentABI as abi } from '@/abi/tounament';
import { getReferralTag, submitReferral } from '@divvi/referral-sdk';
import { Interface } from "ethers";
import { useChainSwitch } from './useChainSwitch';

// Divvi Integration - will be generated dynamically with user address
const CONSUMER_ADDRESS = '0x53eaF4CD171842d8144e45211308e5D90B4b0088' as const

// Types for better TypeScript support
export interface PowerWeights {
  amountWeight: bigint;
  timeWeight: bigint;
  uniquenessWeight: bigint;
}

export interface DiminishingConfig {
  firstVote: bigint;
  secondVote: bigint;
  thirdVote: bigint;
  fourthVote: bigint;
  floorVote: bigint;
}

export interface TimeDecayConfig {
  earlyBonus: bigint;
  midEarlyBonus: bigint;
  midLateBonus: bigint;
  lateBonus: bigint;
}

export interface TournamentConfig {
  powerWeights: PowerWeights;
  diminishing: DiminishingConfig;
  timeDecay: TimeDecayConfig;
  voterRewardBps: bigint;
  minVoteAmount: bigint;
  qfPrecision: bigint;
  maxVotesPerVoter: bigint;
  allowSameProjectVote: boolean;
}

export interface Tournament {
  id: bigint;
  admin: Address;
  sovseasCampaignId: bigint;
  stageDuration: bigint;
  payoutToken: Address;
  autoProgress: boolean;
  active: boolean;
  disqualifyEnabled: boolean;
  createdAt: bigint;
  config: TournamentConfig;
}

export interface Stage {
  stageNumber: bigint;
  start: bigint;
  end: bigint;
  scheduledStart: bigint;
  rewardPool: bigint;
  eliminationPercentage: bigint;
  finalized: boolean;
  started: boolean;
}

export interface StageStatus {
  active: boolean;
  ended: boolean;
  finalized: boolean;
  timeRemaining: bigint;
}

export interface ProjectStatus {
  approved: boolean;
  disqualified: boolean;
  eliminated: boolean;
  approvedAt: bigint;
  eliminatedAt: bigint;
  eliminatedInStage: bigint;
  disqualificationReason: string;
}

export interface Vote {
  projectId: bigint;
  power: bigint;
  timestamp: bigint;
  token: Address;
  amount: bigint;
}

export interface VoterStats {
  totalPowerUsed: bigint;
  totalVotes: bigint;
  uniqueProjectsVoted: bigint;
}

// Hook for creating a tournament
export function useCreateTournament(contractAddress: Address) {
  const { address: user } = useAccount();
  const { sendTransactionAsync, isPending, isError, error, isSuccess } = useSendTransaction();
  const { ensureCorrectChain } = useChainSwitch();

  const createTournament = async ({
    sovseasCampaignId,
    stageDuration,
    payoutToken,
    autoProgress,
    disqualifyEnabled
  }: {
    sovseasCampaignId: bigint;
    stageDuration: bigint;
    payoutToken: Address;
    autoProgress: boolean;
    disqualifyEnabled: boolean;
  }) => {
    try {
      await ensureCorrectChain();

      const tournamentInterface = new Interface(abi);
      const createTournamentData = tournamentInterface.encodeFunctionData('createTournament', [
        sovseasCampaignId,
        stageDuration,
        payoutToken,
        autoProgress,
        disqualifyEnabled
      ]);

      const isTestnet = process.env.NEXT_PUBLIC_ENV === 'testnet';
      const isCeloSepolia = process.env.NEXT_PUBLIC_ENV === 'celo-sepolia' || process.env.NEXT_PUBLIC_NETWORK === 'celo-sepolia';
      let celoChainId: number;
      if (isCeloSepolia) {
        celoChainId = 11142220;
      } else if (isTestnet) {
        celoChainId = 44787;
      } else {
        celoChainId = 42220;
      }

      const referralTag = getReferralTag({
        user: user as Address,
        consumer: CONSUMER_ADDRESS,
      });

      const dataWithSuffix = createTournamentData + referralTag;

      const result = await sendTransactionAsync({
        to: contractAddress,
        data: dataWithSuffix as `0x${string}`,
      });

      try {
        await submitReferral({
          txHash: result as unknown as `0x${string}`,
          chainId: celoChainId
        });
      } catch (referralError) {
        console.error("Referral submission error:", referralError);
      }

      return result;
    } catch (err) {
      console.error('Error creating tournament:', err);
      throw err;
    }
  };

  return {
    createTournament,
    isPending,
    isError,
    error,
    isSuccess
  };
}

// Hook for creating a tournament with advanced config
export function useCreateTournamentAdvanced(contractAddress: Address) {
  const { address: user } = useAccount();
  const { sendTransactionAsync, isPending, isError, error, isSuccess } = useSendTransaction();
  const { ensureCorrectChain } = useChainSwitch();

  const createTournamentAdvanced = async ({
    sovseasCampaignId,
    stageDuration,
    payoutToken,
    autoProgress,
    disqualifyEnabled,
    powerWeights,
    diminishing,
    timeDecay,
    voterRewardBps,
    minVoteAmount,
    qfPrecision,
    maxVotesPerVoter,
    allowSameProjectVote
  }: {
    sovseasCampaignId: bigint;
    stageDuration: bigint;
    payoutToken: Address;
    autoProgress: boolean;
    disqualifyEnabled: boolean;
    powerWeights: PowerWeights;
    diminishing: DiminishingConfig;
    timeDecay: TimeDecayConfig;
    voterRewardBps: bigint;
    minVoteAmount: bigint;
    qfPrecision: bigint;
    maxVotesPerVoter: bigint;
    allowSameProjectVote: boolean;
  }) => {
    try {
      await ensureCorrectChain();

      const tournamentInterface = new Interface(abi);
      const createTournamentData = tournamentInterface.encodeFunctionData('createTournamentAdvanced', [
        sovseasCampaignId,
        stageDuration,
        payoutToken,
        autoProgress,
        disqualifyEnabled,
        powerWeights,
        diminishing,
        timeDecay,
        voterRewardBps,
        minVoteAmount,
        qfPrecision,
        maxVotesPerVoter,
        allowSameProjectVote
      ]);

      const isTestnet = process.env.NEXT_PUBLIC_ENV === 'testnet';
      const isCeloSepolia = process.env.NEXT_PUBLIC_ENV === 'celo-sepolia' || process.env.NEXT_PUBLIC_NETWORK === 'celo-sepolia';
      let celoChainId: number;
      if (isCeloSepolia) {
        celoChainId = 11142220;
      } else if (isTestnet) {
        celoChainId = 44787;
      } else {
        celoChainId = 42220;
      }

      const referralTag = getReferralTag({
        user: user as Address,
        consumer: CONSUMER_ADDRESS,
      });

      const dataWithSuffix = createTournamentData + referralTag;

      const result = await sendTransactionAsync({
        to: contractAddress,
        data: dataWithSuffix as `0x${string}`,
      });

      try {
        await submitReferral({
          txHash: result as unknown as `0x${string}`,
          chainId: celoChainId
        });
      } catch (referralError) {
        console.error("Referral submission error:", referralError);
      }

      return result;
    } catch (err) {
      console.error('Error creating tournament:', err);
      throw err;
    }
  };

  return {
    createTournamentAdvanced,
    isPending,
    isError,
    error,
    isSuccess
  };
}

// Hook for starting a tournament
export function useStartTournament(contractAddress: Address) {
  const { writeContract, isPending, isError, error, isSuccess } = useWriteContract();
  const { ensureCorrectChain } = useChainSwitch();

  const startTournament = async ({
    tournamentId
  }: {
    tournamentId: bigint;
  }) => {
    try {
      await ensureCorrectChain();
      await writeContract({
        address: contractAddress,
        abi,
        functionName: 'startTournament',
        args: [tournamentId]
      });
    } catch (err) {
      console.error('Error starting tournament:', err);
      throw err;
    }
  };

  return {
    startTournament,
    isPending,
    isError,
    error,
    isSuccess
  };
}

// Hook for pausing a tournament
export function usePauseTournament(contractAddress: Address) {
  const { writeContract, isPending, isError, error, isSuccess } = useWriteContract();
  const { ensureCorrectChain } = useChainSwitch();

  const pauseTournament = async ({
    tournamentId
  }: {
    tournamentId: bigint;
  }) => {
    try {
      await ensureCorrectChain();
      await writeContract({
        address: contractAddress,
        abi,
        functionName: 'pauseTournament',
        args: [tournamentId]
      });
    } catch (err) {
      console.error('Error pausing tournament:', err);
      throw err;
    }
  };

  return {
    pauseTournament,
    isPending,
    isError,
    error,
    isSuccess
  };
}

// Hook for unpausing a tournament
export function useUnpauseTournament(contractAddress: Address) {
  const { writeContract, isPending, isError, error, isSuccess } = useWriteContract();
  const { ensureCorrectChain } = useChainSwitch();

  const unpauseTournament = async ({
    tournamentId
  }: {
    tournamentId: bigint;
  }) => {
    try {
      await ensureCorrectChain();
      await writeContract({
        address: contractAddress,
        abi,
        functionName: 'unpauseTournament',
        args: [tournamentId]
      });
    } catch (err) {
      console.error('Error unpausing tournament:', err);
      throw err;
    }
  };

  return {
    unpauseTournament,
    isPending,
    isError,
    error,
    isSuccess
  };
}

// Hook for adding a project
export function useAddProject(contractAddress: Address) {
  const { writeContract, isPending, isError, error, isSuccess } = useWriteContract();
  const { ensureCorrectChain } = useChainSwitch();

  const addProject = async ({
    tournamentId,
    projectId
  }: {
    tournamentId: bigint;
    projectId: bigint;
  }) => {
    try {
      await ensureCorrectChain();
      await writeContract({
        address: contractAddress,
        abi,
        functionName: 'addProject',
        args: [tournamentId, projectId]
      });
    } catch (err) {
      console.error('Error adding project:', err);
      throw err;
    }
  };

  return {
    addProject,
    isPending,
    isError,
    error,
    isSuccess
  };
}

// Hook for adding projects in batch
export function useAddProjectsBatch(contractAddress: Address) {
  const { writeContract, isPending, isError, error, isSuccess } = useWriteContract();
  const { ensureCorrectChain } = useChainSwitch();

  const addProjectsBatch = async ({
    tournamentId,
    projectIds
  }: {
    tournamentId: bigint;
    projectIds: bigint[];
  }) => {
    try {
      await ensureCorrectChain();
      await writeContract({
        address: contractAddress,
        abi,
        functionName: 'addProjectsBatch',
        args: [tournamentId, projectIds]
      });
    } catch (err) {
      console.error('Error adding projects batch:', err);
      throw err;
    }
  };

  return {
    addProjectsBatch,
    isPending,
    isError,
    error,
    isSuccess
  };
}

// Hook for adding campaign projects
export function useAddCampaignProjects(contractAddress: Address) {
  const { writeContract, isPending, isError, error, isSuccess } = useWriteContract();
  const { ensureCorrectChain } = useChainSwitch();

  const addCampaignProjects = async ({
    tournamentId,
    campaignId
  }: {
    tournamentId: bigint;
    campaignId: bigint;
  }) => {
    try {
      await ensureCorrectChain();
      await writeContract({
        address: contractAddress,
        abi,
        functionName: 'addCampaignProjects',
        args: [tournamentId, campaignId]
      });
    } catch (err) {
      console.error('Error adding campaign projects:', err);
      throw err;
    }
  };

  return {
    addCampaignProjects,
    isPending,
    isError,
    error,
    isSuccess
  };
}

// Hook for removing a project
export function useRemoveProject(contractAddress: Address) {
  const { writeContract, isPending, isError, error, isSuccess } = useWriteContract();
  const { ensureCorrectChain } = useChainSwitch();

  const removeProject = async ({
    tournamentId,
    projectId
  }: {
    tournamentId: bigint;
    projectId: bigint;
  }) => {
    try {
      await ensureCorrectChain();
      await writeContract({
        address: contractAddress,
        abi,
        functionName: 'removeProject',
        args: [tournamentId, projectId]
      });
    } catch (err) {
      console.error('Error removing project:', err);
      throw err;
    }
  };

  return {
    removeProject,
    isPending,
    isError,
    error,
    isSuccess
  };
}

// Hook for removing projects in batch
export function useRemoveProjectsBatch(contractAddress: Address) {
  const { writeContract, isPending, isError, error, isSuccess } = useWriteContract();
  const { ensureCorrectChain } = useChainSwitch();

  const removeProjectsBatch = async ({
    tournamentId,
    projectIds
  }: {
    tournamentId: bigint;
    projectIds: bigint[];
  }) => {
    try {
      await ensureCorrectChain();
      await writeContract({
        address: contractAddress,
        abi,
        functionName: 'removeProjectsBatch',
        args: [tournamentId, projectIds]
      });
    } catch (err) {
      console.error('Error removing projects batch:', err);
      throw err;
    }
  };

  return {
    removeProjectsBatch,
    isPending,
    isError,
    error,
    isSuccess
  };
}

// Hook for approving a project
export function useApproveProject(contractAddress: Address) {
  const { writeContract, isPending, isError, error, isSuccess } = useWriteContract();
  const { ensureCorrectChain } = useChainSwitch();

  const approveProject = async ({
    tournamentId,
    projectId
  }: {
    tournamentId: bigint;
    projectId: bigint;
  }) => {
    try {
      await ensureCorrectChain();
      await writeContract({
        address: contractAddress,
        abi,
        functionName: 'approveProject',
        args: [tournamentId, projectId]
      });
    } catch (err) {
      console.error('Error approving project:', err);
      throw err;
    }
  };

  return {
    approveProject,
    isPending,
    isError,
    error,
    isSuccess
  };
}

// Hook for approving multiple projects
export function useApproveMultipleProjects(contractAddress: Address) {
  const { writeContract, isPending, isError, error, isSuccess } = useWriteContract();
  const { ensureCorrectChain } = useChainSwitch();

  const approveMultipleProjects = async ({
    tournamentId,
    projectIds
  }: {
    tournamentId: bigint;
    projectIds: bigint[];
  }) => {
    try {
      await ensureCorrectChain();
      await writeContract({
        address: contractAddress,
        abi,
        functionName: 'approveMultipleProjects',
        args: [tournamentId, projectIds]
      });
    } catch (err) {
      console.error('Error approving multiple projects:', err);
      throw err;
    }
  };

  return {
    approveMultipleProjects,
    isPending,
    isError,
    error,
    isSuccess
  };
}

// Hook for batch approving projects
export function useBatchApproveProjects(contractAddress: Address) {
  const { writeContract, isPending, isError, error, isSuccess } = useWriteContract();
  const { ensureCorrectChain } = useChainSwitch();

  const batchApproveProjects = async ({
    tournamentId,
    projectIds
  }: {
    tournamentId: bigint;
    projectIds: bigint[];
  }) => {
    try {
      await ensureCorrectChain();
      await writeContract({
        address: contractAddress,
        abi,
        functionName: 'batchApproveProjects',
        args: [tournamentId, projectIds]
      });
    } catch (err) {
      console.error('Error batch approving projects:', err);
      throw err;
    }
  };

  return {
    batchApproveProjects,
    isPending,
    isError,
    error,
    isSuccess
  };
}

// Hook for disqualifying a project
export function useDisqualifyProject(contractAddress: Address) {
  const { writeContract, isPending, isError, error, isSuccess } = useWriteContract();
  const { ensureCorrectChain } = useChainSwitch();

  const disqualifyProject = async ({
    tournamentId,
    projectId,
    reason
  }: {
    tournamentId: bigint;
    projectId: bigint;
    reason: string;
  }) => {
    try {
      await ensureCorrectChain();
      await writeContract({
        address: contractAddress,
        abi,
        functionName: 'disqualifyProject',
        args: [tournamentId, projectId, reason]
      });
    } catch (err) {
      console.error('Error disqualifying project:', err);
      throw err;
    }
  };

  return {
    disqualifyProject,
    isPending,
    isError,
    error,
    isSuccess
  };
}

// Hook for voting with CELO
export function useVoteWithCelo(contractAddress: Address) {
  const { address: user } = useAccount();
  const { sendTransactionAsync, isPending, isError, error, isSuccess } = useSendTransaction();
  const { ensureCorrectChain } = useChainSwitch();

  const voteWithCelo = async ({
    tournamentId,
    projectId
  }: {
    tournamentId: bigint;
    projectId: bigint;
  }) => {
    try {
      await ensureCorrectChain();

      const tournamentInterface = new Interface(abi);
      const voteData = tournamentInterface.encodeFunctionData('voteWithCelo', [
        tournamentId,
        projectId
      ]);

      const isTestnet = process.env.NEXT_PUBLIC_ENV === 'testnet';
      const isCeloSepolia = process.env.NEXT_PUBLIC_ENV === 'celo-sepolia' || process.env.NEXT_PUBLIC_NETWORK === 'celo-sepolia';
      let celoChainId: number;
      if (isCeloSepolia) {
        celoChainId = 11142220;
      } else if (isTestnet) {
        celoChainId = 44787;
      } else {
        celoChainId = 42220;
      }

      const referralTag = getReferralTag({
        user: user as Address,
        consumer: CONSUMER_ADDRESS,
      });

      const dataWithSuffix = voteData + referralTag;

      const result = await sendTransactionAsync({
        to: contractAddress,
        data: dataWithSuffix as `0x${string}`,
        value: 0n // Will be set by user in wallet
      });

      try {
        await submitReferral({
          txHash: result as unknown as `0x${string}`,
          chainId: celoChainId
        });
      } catch (referralError) {
        console.error("Referral submission error:", referralError);
      }

      return result;
    } catch (err) {
      console.error('Error voting with CELO:', err);
      throw err;
    }
  };

  return {
    voteWithCelo,
    isPending,
    isError,
    error,
    isSuccess
  };
}

// Hook for voting with token
export function useVoteWithToken(contractAddress: Address) {
  const { address: user } = useAccount();
  const { sendTransactionAsync, isPending, isError, error, isSuccess } = useSendTransaction();
  const { ensureCorrectChain } = useChainSwitch();

  const voteWithToken = async ({
    tournamentId,
    projectId,
    token,
    amount
  }: {
    tournamentId: bigint;
    projectId: bigint;
    token: Address;
    amount: bigint;
  }) => {
    try {
      await ensureCorrectChain();

      const tournamentInterface = new Interface(abi);
      const voteData = tournamentInterface.encodeFunctionData('voteWithToken', [
        tournamentId,
        projectId,
        token,
        amount
      ]);

      const isTestnet = process.env.NEXT_PUBLIC_ENV === 'testnet';
      const isCeloSepolia = process.env.NEXT_PUBLIC_ENV === 'celo-sepolia' || process.env.NEXT_PUBLIC_NETWORK === 'celo-sepolia';
      let celoChainId: number;
      if (isCeloSepolia) {
        celoChainId = 11142220;
      } else if (isTestnet) {
        celoChainId = 44787;
      } else {
        celoChainId = 42220;
      }

      const referralTag = getReferralTag({
        user: user as Address,
        consumer: CONSUMER_ADDRESS,
      });

      const dataWithSuffix = voteData + referralTag;

      const result = await sendTransactionAsync({
        to: contractAddress,
        data: dataWithSuffix as `0x${string}`,
      });

      try {
        await submitReferral({
          txHash: result as unknown as `0x${string}`,
          chainId: celoChainId
        });
      } catch (referralError) {
        console.error("Referral submission error:", referralError);
      }

      return result;
    } catch (err) {
      console.error('Error voting with token:', err);
      throw err;
    }
  };

  return {
    voteWithToken,
    isPending,
    isError,
    error,
    isSuccess
  };
}

// Hook for batch voting with CELO
export function useBatchVoteWithCelo(contractAddress: Address) {
  const { address: user } = useAccount();
  const { sendTransactionAsync, isPending, isError, error, isSuccess } = useSendTransaction();
  const { ensureCorrectChain } = useChainSwitch();

  const batchVoteWithCelo = async ({
    tournamentId,
    projectIds
  }: {
    tournamentId: bigint;
    projectIds: bigint[];
  }) => {
    try {
      await ensureCorrectChain();

      const tournamentInterface = new Interface(abi);
      const voteData = tournamentInterface.encodeFunctionData('batchVoteWithCelo', [
        tournamentId,
        projectIds
      ]);

      const isTestnet = process.env.NEXT_PUBLIC_ENV === 'testnet';
      const isCeloSepolia = process.env.NEXT_PUBLIC_ENV === 'celo-sepolia' || process.env.NEXT_PUBLIC_NETWORK === 'celo-sepolia';
      let celoChainId: number;
      if (isCeloSepolia) {
        celoChainId = 11142220;
      } else if (isTestnet) {
        celoChainId = 44787;
      } else {
        celoChainId = 42220;
      }

      const referralTag = getReferralTag({
        user: user as Address,
        consumer: CONSUMER_ADDRESS,
      });

      const dataWithSuffix = voteData + referralTag;

      const result = await sendTransactionAsync({
        to: contractAddress,
        data: dataWithSuffix as `0x${string}`,
        value: 0n // Will be set by user in wallet
      });

      try {
        await submitReferral({
          txHash: result as unknown as `0x${string}`,
          chainId: celoChainId
        });
      } catch (referralError) {
        console.error("Referral submission error:", referralError);
      }

      return result;
    } catch (err) {
      console.error('Error batch voting with CELO:', err);
      throw err;
    }
  };

  return {
    batchVoteWithCelo,
    isPending,
    isError,
    error,
    isSuccess
  };
}

// Hook for batch voting with token
export function useBatchVoteWithToken(contractAddress: Address) {
  const { address: user } = useAccount();
  const { sendTransactionAsync, isPending, isError, error, isSuccess } = useSendTransaction();
  const { ensureCorrectChain } = useChainSwitch();

  const batchVoteWithToken = async ({
    tournamentId,
    projectIds,
    token,
    amounts
  }: {
    tournamentId: bigint;
    projectIds: bigint[];
    token: Address;
    amounts: bigint[];
  }) => {
    try {
      await ensureCorrectChain();

      const tournamentInterface = new Interface(abi);
      const voteData = tournamentInterface.encodeFunctionData('batchVoteWithToken', [
        tournamentId,
        projectIds,
        token,
        amounts
      ]);

      const isTestnet = process.env.NEXT_PUBLIC_ENV === 'testnet';
      const isCeloSepolia = process.env.NEXT_PUBLIC_ENV === 'celo-sepolia' || process.env.NEXT_PUBLIC_NETWORK === 'celo-sepolia';
      let celoChainId: number;
      if (isCeloSepolia) {
        celoChainId = 11142220;
      } else if (isTestnet) {
        celoChainId = 44787;
      } else {
        celoChainId = 42220;
      }

      const referralTag = getReferralTag({
        user: user as Address,
        consumer: CONSUMER_ADDRESS,
      });

      const dataWithSuffix = voteData + referralTag;

      const result = await sendTransactionAsync({
        to: contractAddress,
        data: dataWithSuffix as `0x${string}`,
      });

      try {
        await submitReferral({
          txHash: result as unknown as `0x${string}`,
          chainId: celoChainId
        });
      } catch (referralError) {
        console.error("Referral submission error:", referralError);
      }

      return result;
    } catch (err) {
      console.error('Error batch voting with token:', err);
      throw err;
    }
  };

  return {
    batchVoteWithToken,
    isPending,
    isError,
    error,
    isSuccess
  };
}

// Hook for funding stage with CELO
export function useFundStageWithCelo(contractAddress: Address) {
  const { sendTransactionAsync, isPending, isError, error, isSuccess } = useSendTransaction();
  const { ensureCorrectChain } = useChainSwitch();

  const fundStageWithCelo = async ({
    tournamentId,
    stageNumber
  }: {
    tournamentId: bigint;
    stageNumber: bigint;
  }) => {
    try {
      await ensureCorrectChain();

      const tournamentInterface = new Interface(abi);
      const fundData = tournamentInterface.encodeFunctionData('fundStageWithCelo', [
        tournamentId,
        stageNumber
      ]);

      const result = await sendTransactionAsync({
        to: contractAddress,
        data: fundData as `0x${string}`,
        value: 0n // Will be set by user in wallet
      });

      return result;
    } catch (err) {
      console.error('Error funding stage with CELO:', err);
      throw err;
    }
  };

  return {
    fundStageWithCelo,
    isPending,
    isError,
    error,
    isSuccess
  };
}

// Hook for funding stage with token
export function useFundStageWithToken(contractAddress: Address) {
  const { writeContract, isPending, isError, error, isSuccess } = useWriteContract();
  const { ensureCorrectChain } = useChainSwitch();

  const fundStageWithToken = async ({
    tournamentId,
    stageNumber,
    token,
    amount
  }: {
    tournamentId: bigint;
    stageNumber: bigint;
    token: Address;
    amount: bigint;
  }) => {
    try {
      await ensureCorrectChain();
      await writeContract({
        address: contractAddress,
        abi,
        functionName: 'fundStageWithToken',
        args: [tournamentId, stageNumber, token, amount]
      });
    } catch (err) {
      console.error('Error funding stage with token:', err);
      throw err;
    }
  };

  return {
    fundStageWithToken,
    isPending,
    isError,
    error,
    isSuccess
  };
}

// Hook for scheduling next stage
export function useScheduleNextStage(contractAddress: Address) {
  const { writeContract, isPending, isError, error, isSuccess } = useWriteContract();
  const { ensureCorrectChain } = useChainSwitch();

  const scheduleNextStage = async ({
    tournamentId,
    scheduledStart,
    eliminationPercentage
  }: {
    tournamentId: bigint;
    scheduledStart: bigint;
    eliminationPercentage: bigint;
  }) => {
    try {
      await ensureCorrectChain();
      await writeContract({
        address: contractAddress,
        abi,
        functionName: 'scheduleNextStage',
        args: [tournamentId, scheduledStart, eliminationPercentage]
      });
    } catch (err) {
      console.error('Error scheduling next stage:', err);
      throw err;
    }
  };

  return {
    scheduleNextStage,
    isPending,
    isError,
    error,
    isSuccess
  };
}

// Hook for starting scheduled stage
export function useStartScheduledStage(contractAddress: Address) {
  const { writeContract, isPending, isError, error, isSuccess } = useWriteContract();
  const { ensureCorrectChain } = useChainSwitch();

  const startScheduledStage = async ({
    tournamentId
  }: {
    tournamentId: bigint;
  }) => {
    try {
      await ensureCorrectChain();
      await writeContract({
        address: contractAddress,
        abi,
        functionName: 'startScheduledStage',
        args: [tournamentId]
      });
    } catch (err) {
      console.error('Error starting scheduled stage:', err);
      throw err;
    }
  };

  return {
    startScheduledStage,
    isPending,
    isError,
    error,
    isSuccess
  };
}

// Hook for starting next stage manually
export function useStartNextStageManually(contractAddress: Address) {
  const { writeContract, isPending, isError, error, isSuccess } = useWriteContract();
  const { ensureCorrectChain } = useChainSwitch();

  const startNextStageManually = async ({
    tournamentId
  }: {
    tournamentId: bigint;
  }) => {
    try {
      await ensureCorrectChain();
      await writeContract({
        address: contractAddress,
        abi,
        functionName: 'startNextStageManually',
        args: [tournamentId]
      });
    } catch (err) {
      console.error('Error starting next stage manually:', err);
      throw err;
    }
  };

  return {
    startNextStageManually,
    isPending,
    isError,
    error,
    isSuccess
  };
}

// Hook for finalizing stage
export function useFinalizeStage(contractAddress: Address) {
  const { writeContract, isPending, isError, error, isSuccess } = useWriteContract();
  const { ensureCorrectChain } = useChainSwitch();

  const finalizeStage = async ({
    tournamentId
  }: {
    tournamentId: bigint;
  }) => {
    try {
      await ensureCorrectChain();
      await writeContract({
        address: contractAddress,
        abi,
        functionName: 'finalizeStage',
        args: [tournamentId]
      });
    } catch (err) {
      console.error('Error finalizing stage:', err);
      throw err;
    }
  };

  return {
    finalizeStage,
    isPending,
    isError,
    error,
    isSuccess
  };
}

// Hook for claiming voter reward
export function useClaimVoterReward(contractAddress: Address) {
  const { writeContract, isPending, isError, error, isSuccess } = useWriteContract();
  const { ensureCorrectChain } = useChainSwitch();

  const claimVoterReward = async ({
    tournamentId,
    stageNumber
  }: {
    tournamentId: bigint;
    stageNumber: bigint;
  }) => {
    try {
      await ensureCorrectChain();
      await writeContract({
        address: contractAddress,
        abi,
        functionName: 'claimVoterReward',
        args: [tournamentId, stageNumber]
      });
    } catch (err) {
      console.error('Error claiming voter reward:', err);
      throw err;
    }
  };

  return {
    claimVoterReward,
    isPending,
    isError,
    error,
    isSuccess
  };
}

// Hook for converting tokens externally
export function useConvertTokensExternal(contractAddress: Address) {
  const { writeContract, isPending, isError, error, isSuccess } = useWriteContract();
  const { ensureCorrectChain } = useChainSwitch();

  const convertTokensExternal = async ({
    fromToken,
    toToken,
    amount
  }: {
    fromToken: Address;
    toToken: Address;
    amount: bigint;
  }) => {
    try {
      await ensureCorrectChain();
      await writeContract({
        address: contractAddress,
        abi,
        functionName: 'convertTokensExternal',
        args: [fromToken, toToken, amount]
      });
    } catch (err) {
      console.error('Error converting tokens:', err);
      throw err;
    }
  };

  return {
    convertTokensExternal,
    isPending,
    isError,
    error,
    isSuccess
  };
}

// READ HOOKS

// Hook for reading next tournament ID
export function useNextTournamentId(contractAddress: Address) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'nextTournamentId',
    query: {
      enabled: !!contractAddress
    }
  });

  return {
    nextTournamentId: data as bigint,
    isLoading,
    error,
    refetch
  };
}

// Hook for reading a tournament
export function useTournament(contractAddress: Address, tournamentId: bigint) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'tournaments',
    args: [tournamentId],
    query: {
      enabled: !!contractAddress && tournamentId !== undefined
    }
  });

  const tournament = data ? {
    id: (data as any[])[0] as bigint,
    admin: (data as any[])[1] as Address,
    sovseasCampaignId: (data as any[])[2] as bigint,
    stageDuration: (data as any[])[3] as bigint,
    payoutToken: (data as any[])[4] as Address,
    autoProgress: (data as any[])[5] as boolean,
    active: (data as any[])[6] as boolean,
    disqualifyEnabled: (data as any[])[7] as boolean,
    createdAt: (data as any[])[8] as bigint,
    config: (data as any[])[9] as TournamentConfig
  } as Tournament : null;

  return {
    tournament,
    isLoading,
    error,
    refetch
  };
}

// Hook for reading all tournaments
export function useAllTournaments(contractAddress: Address) {
  const { nextTournamentId, isLoading: countLoading } = useNextTournamentId(contractAddress);

  // Generate tournament IDs from 0 to nextTournamentId - 1
  const tournamentIds = nextTournamentId !== undefined 
    ? Array.from({ length: Number(nextTournamentId) }, (_, i) => BigInt(i))
    : [];

  // Create contracts for fetching all tournaments
  const contracts = tournamentIds.map(tournamentId => ({
    address: contractAddress,
    abi,
    functionName: 'tournaments' as const,
    args: [tournamentId] as const
  }));

  const { data, isLoading: tournamentsLoading, error, refetch } = useReadContracts({
    contracts: contracts as unknown as readonly {
      address: Address;
      abi: Abi;
      functionName: string;
      args: readonly [bigint];
    }[],
    query: {
      enabled: !!contractAddress && tournamentIds.length > 0
    }
  });

  const tournaments: Tournament[] = [];
  
  if (data && tournamentIds.length > 0) {
    for (let i = 0; i < tournamentIds.length; i++) {
      const result = data[i]?.result;
      if (result) {
        tournaments.push({
          id: tournamentIds[i],
          admin: (result as any[])[1] as Address,
          sovseasCampaignId: (result as any[])[2] as bigint,
          stageDuration: (result as any[])[3] as bigint,
          payoutToken: (result as any[])[4] as Address,
          autoProgress: (result as any[])[5] as boolean,
          active: (result as any[])[6] as boolean,
          disqualifyEnabled: (result as any[])[7] as boolean,
          createdAt: (result as any[])[8] as bigint,
          config: (result as any[])[9] as TournamentConfig
        });
      }
    }
  }

  return {
    tournaments,
    isLoading: countLoading || tournamentsLoading,
    error,
    refetch
  };
}

// Hook for reading tournament config
export function useTournamentConfig(contractAddress: Address, tournamentId: bigint) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getTournamentConfig',
    args: [tournamentId],
    query: {
      enabled: !!contractAddress && tournamentId !== undefined
    }
  });

  const config = data ? {
    powerWeights: (data as any[])[0] as PowerWeights,
    diminishing: (data as any[])[1] as DiminishingConfig,
    timeDecay: (data as any[])[2] as TimeDecayConfig,
    voterRewardBps: (data as any[])[3] as bigint,
    minVoteAmount: (data as any[])[4] as bigint,
    qfPrecision: (data as any[])[5] as bigint,
    maxVotesPerVoter: (data as any[])[6] as bigint,
    allowSameProjectVote: (data as any[])[7] as boolean
  } as TournamentConfig : null;

  return {
    config,
    isLoading,
    error,
    refetch
  };
}

// Hook for reading tournament projects
export function useTournamentProjects(contractAddress: Address, tournamentId: bigint) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getTournamentProjects',
    args: [tournamentId],
    query: {
      enabled: !!contractAddress && tournamentId !== undefined
    }
  });

  return {
    projectIds: (data as bigint[]) || [],
    isLoading,
    error,
    refetch
  };
}

// Hook for reading approved projects
export function useApprovedProjects(contractAddress: Address, tournamentId: bigint) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getApprovedProjects',
    args: [tournamentId],
    query: {
      enabled: !!contractAddress && tournamentId !== undefined
    }
  });

  return {
    approvedProjectIds: (data as bigint[]) || [],
    isLoading,
    error,
    refetch
  };
}

// Hook for reading project status
export function useProjectStatus(contractAddress: Address, tournamentId: bigint, projectId: bigint) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getProjectStatus',
    args: [tournamentId, projectId],
    query: {
      enabled: !!contractAddress && tournamentId !== undefined && projectId !== undefined
    }
  });

  const status = data ? {
    approved: (data as any[])[0] as boolean,
    disqualified: (data as any[])[1] as boolean,
    eliminated: (data as any[])[2] as boolean,
    approvedAt: (data as any[])[3] as bigint,
    eliminatedAt: (data as any[])[4] as bigint,
    eliminatedInStage: (data as any[])[5] as bigint,
    disqualificationReason: (data as any[])[6] as string
  } as ProjectStatus : null;

  return {
    status,
    isLoading,
    error,
    refetch
  };
}

// Hook for reading stage count
export function useStageCount(contractAddress: Address, tournamentId: bigint) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getStageCount',
    args: [tournamentId],
    query: {
      enabled: !!contractAddress && tournamentId !== undefined
    }
  });

  return {
    stageCount: data as bigint,
    isLoading,
    error,
    refetch
  };
}

// Hook for reading current stage number
export function useCurrentStageNumber(contractAddress: Address, tournamentId: bigint) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getCurrentStageNumber',
    args: [tournamentId],
    query: {
      enabled: !!contractAddress && tournamentId !== undefined
    }
  });

  return {
    currentStageNumber: data as bigint,
    isLoading,
    error,
    refetch
  };
}

// Hook for reading stage info
export function useStageInfo(contractAddress: Address, tournamentId: bigint, stageNumber: bigint) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getStageInfo',
    args: [tournamentId, stageNumber],
    query: {
      enabled: !!contractAddress && tournamentId !== undefined && stageNumber !== undefined
    }
  });

  const stage = data ? {
    stageNumber: (data as any[])[0] as bigint,
    start: (data as any[])[1] as bigint,
    end: (data as any[])[2] as bigint,
    scheduledStart: (data as any[])[3] as bigint,
    rewardPool: (data as any[])[4] as bigint,
    eliminationPercentage: (data as any[])[5] as bigint,
    finalized: (data as any[])[6] as boolean,
    started: (data as any[])[7] as boolean
  } as Stage : null;

  return {
    stage,
    isLoading,
    error,
    refetch
  };
}

// Hook for reading stage status
export function useStageStatus(contractAddress: Address, tournamentId: bigint, stageNumber: bigint) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getStageStatus',
    args: [tournamentId, stageNumber],
    query: {
      enabled: !!contractAddress && tournamentId !== undefined && stageNumber !== undefined
    }
  });

  const status = data ? {
    active: (data as any[])[0] as boolean,
    ended: (data as any[])[1] as boolean,
    finalized: (data as any[])[2] as boolean,
    timeRemaining: (data as any[])[3] as bigint
  } as StageStatus : null;

  return {
    status,
    isLoading,
    error,
    refetch
  };
}

// Hook for reading if stage can be finalized
export function useCanFinalizeStage(contractAddress: Address, tournamentId: bigint, stageNumber: bigint) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'canFinalizeStage',
    args: [tournamentId, stageNumber],
    query: {
      enabled: !!contractAddress && tournamentId !== undefined && stageNumber !== undefined
    }
  });

  return {
    canFinalize: data as boolean,
    isLoading,
    error,
    refetch
  };
}

// Hook for reading stage token amount
export function useStageTokenAmount(contractAddress: Address, tournamentId: bigint, stageNumber: bigint, token: Address) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getStageTokenAmount',
    args: [tournamentId, stageNumber, token],
    query: {
      enabled: !!contractAddress && tournamentId !== undefined && stageNumber !== undefined && !!token
    }
  });

  return {
    tokenAmount: data as bigint,
    isLoading,
    error,
    refetch
  };
}

// Hook for reading stage used tokens
export function useStageUsedTokens(contractAddress: Address, tournamentId: bigint, stageNumber: bigint) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getStageUsedTokens',
    args: [tournamentId, stageNumber],
    query: {
      enabled: !!contractAddress && tournamentId !== undefined && stageNumber !== undefined
    }
  });

  return {
    usedTokens: (data as Address[]) || [],
    isLoading,
    error,
    refetch
  };
}

// Hook for reading stage voters
export function useStageVoters(contractAddress: Address, tournamentId: bigint, stageNumber: bigint) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getStageVoters',
    args: [tournamentId, stageNumber],
    query: {
      enabled: !!contractAddress && tournamentId !== undefined && stageNumber !== undefined
    }
  });

  return {
    voters: (data as Address[]) || [],
    isLoading,
    error,
    refetch
  };
}

// Hook for reading stage failed conversions
export function useStageFailedConversions(contractAddress: Address, tournamentId: bigint, stageNumber: bigint, token: Address) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getStageFailedConversions',
    args: [tournamentId, stageNumber, token],
    query: {
      enabled: !!contractAddress && tournamentId !== undefined && stageNumber !== undefined && !!token
    }
  });

  return {
    failedConversions: data as bigint,
    isLoading,
    error,
    refetch
  };
}

// Hook for reading leaderboard
export function useLeaderboard(contractAddress: Address, tournamentId: bigint, stageNumber: bigint) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getLeaderboard',
    args: [tournamentId, stageNumber],
    query: {
      enabled: !!contractAddress && tournamentId !== undefined && stageNumber !== undefined
    }
  });

  const leaderboard = data ? {
    projectIds: (data as any[])[0] as bigint[],
    powers: (data as any[])[1] as bigint[]
  } : null;

  return {
    leaderboard,
    isLoading,
    error,
    refetch
  };
}

// Hook for reading project power
export function useProjectPower(contractAddress: Address, tournamentId: bigint, stageNumber: bigint, projectId: bigint) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getProjectPower',
    args: [tournamentId, stageNumber, projectId],
    query: {
      enabled: !!contractAddress && tournamentId !== undefined && stageNumber !== undefined && projectId !== undefined
    }
  });

  return {
    power: data as bigint,
    isLoading,
    error,
    refetch
  };
}

// Hook for reading project expected reward
export function useProjectExpectedReward(contractAddress: Address, tournamentId: bigint, stageNumber: bigint, projectId: bigint) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getProjectExpectedReward',
    args: [tournamentId, stageNumber, projectId],
    query: {
      enabled: !!contractAddress && tournamentId !== undefined && stageNumber !== undefined && projectId !== undefined
    }
  });

  return {
    expectedReward: data as bigint,
    isLoading,
    error,
    refetch
  };
}

// Hook for reading if voter has voted
export function useHasVoted(contractAddress: Address, tournamentId: bigint, stageNumber: bigint, projectId: bigint, voter: Address) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'hasVoted',
    args: [tournamentId, stageNumber, projectId, voter],
    query: {
      enabled: !!contractAddress && tournamentId !== undefined && stageNumber !== undefined && projectId !== undefined && !!voter
    }
  });

  return {
    hasVoted: data as boolean,
    isLoading,
    error,
    refetch
  };
}

// Hook for reading if voter has voted in stage
export function useHasVotedInStage(contractAddress: Address, tournamentId: bigint, stageNumber: bigint, voter: Address) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'hasVotedInStage',
    args: [tournamentId, stageNumber, voter],
    query: {
      enabled: !!contractAddress && tournamentId !== undefined && stageNumber !== undefined && !!voter
    }
  });

  return {
    hasVotedInStage: data as boolean,
    isLoading,
    error,
    refetch
  };
}

// Hook for reading voter vote count
export function useVoterVoteCount(contractAddress: Address, tournamentId: bigint, stageNumber: bigint, voter: Address) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getVoterVoteCount',
    args: [tournamentId, stageNumber, voter],
    query: {
      enabled: !!contractAddress && tournamentId !== undefined && stageNumber !== undefined && !!voter
    }
  });

  return {
    voteCount: data as bigint,
    isLoading,
    error,
    refetch
  };
}

// Hook for reading voter vote in stage
export function useVoterVoteInStage(contractAddress: Address, tournamentId: bigint, stageNumber: bigint, projectId: bigint, voter: Address) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getVoterVoteInStage',
    args: [tournamentId, stageNumber, projectId, voter],
    query: {
      enabled: !!contractAddress && tournamentId !== undefined && stageNumber !== undefined && projectId !== undefined && !!voter
    }
  });

  const vote = data ? {
    projectId: (data as any[])[0] as bigint,
    power: (data as any[])[1] as bigint,
    token: (data as any[])[2] as Address,
    amount: (data as any[])[3] as bigint,
    timestamp: (data as any[])[4] as bigint
  } as Vote : null;

  return {
    vote,
    isLoading,
    error,
    refetch
  };
}

// Hook for reading all voter votes in stage
export function useVoterAllVotesInStage(contractAddress: Address, tournamentId: bigint, stageNumber: bigint, voter: Address) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getVoterAllVotesInStage',
    args: [tournamentId, stageNumber, voter],
    query: {
      enabled: !!contractAddress && tournamentId !== undefined && stageNumber !== undefined && !!voter
    }
  });

  const votes = data ? {
    projectIds: (data as any[])[0] as bigint[],
    powers: (data as any[])[1] as bigint[],
    tokens: (data as any[])[2] as Address[],
    amounts: (data as any[])[3] as bigint[],
    timestamps: (data as any[])[4] as bigint[]
  } : null;

  return {
    votes,
    isLoading,
    error,
    refetch
  };
}

// Hook for reading voter history
export function useVoterHistory(contractAddress: Address, tournamentId: bigint, voter: Address) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getVoterHistory',
    args: [tournamentId, voter],
    query: {
      enabled: !!contractAddress && tournamentId !== undefined && !!voter
    }
  });

  const history = data ? {
    stages: (data as any[])[0] as bigint[],
    projectIdsPerStage: (data as any[])[1] as bigint[][],
    powersPerStage: (data as any[])[2] as bigint[][],
    totalPowerPerStage: (data as any[])[3] as bigint[],
    voteCountsPerStage: (data as any[])[4] as bigint[]
  } : null;

  return {
    history,
    isLoading,
    error,
    refetch
  };
}

// Hook for reading voter loyalty stages
export function useVoterLoyaltyStages(contractAddress: Address, tournamentId: bigint, voter: Address) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getVoterLoyaltyStages',
    args: [tournamentId, voter],
    query: {
      enabled: !!contractAddress && tournamentId !== undefined && !!voter
    }
  });

  return {
    loyaltyStages: data as bigint,
    isLoading,
    error,
    refetch
  };
}

// Hook for reading voter pending reward
export function useVoterPendingReward(contractAddress: Address, tournamentId: bigint, stageNumber: bigint, voter: Address) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getVoterPendingReward',
    args: [tournamentId, stageNumber, voter],
    query: {
      enabled: !!contractAddress && tournamentId !== undefined && stageNumber !== undefined && !!voter
    }
  });

  return {
    pendingReward: data as bigint,
    isLoading,
    error,
    refetch
  };
}

// Hook for reading unclaimed rewards
export function useUnclaimedRewards(contractAddress: Address, tournamentId: bigint, voter: Address) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getUnclaimedRewards',
    args: [tournamentId, voter],
    query: {
      enabled: !!contractAddress && tournamentId !== undefined && !!voter
    }
  });

  const rewards = data ? {
    stages: (data as any[])[0] as bigint[],
    amounts: (data as any[])[1] as bigint[]
  } : null;

  return {
    rewards,
    isLoading,
    error,
    refetch
  };
}

// Hook for reading next vote diminishing factor
export function useNextVoteDiminishingFactor(contractAddress: Address, tournamentId: bigint, stageNumber: bigint, voter: Address) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getNextVoteDiminishingFactor',
    args: [tournamentId, stageNumber, voter],
    query: {
      enabled: !!contractAddress && tournamentId !== undefined && stageNumber !== undefined && !!voter
    }
  });

  return {
    diminishingFactor: data as bigint,
    isLoading,
    error,
    refetch
  };
}

// Hook for reading estimate vote power
export function useEstimateVotePower(contractAddress: Address, tournamentId: bigint, voter: Address, amount: bigint) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'estimateVotePower',
    args: [tournamentId, voter, amount],
    query: {
      enabled: !!contractAddress && tournamentId !== undefined && !!voter && amount !== undefined
    }
  });

  return {
    estimatedPower: data as bigint,
    isLoading,
    error,
    refetch
  };
}

// Hook for reading voter stats
export function useVoterStats(contractAddress: Address, tournamentId: bigint, voter: Address) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'tournamentVoterStats',
    args: [tournamentId, voter],
    query: {
      enabled: !!contractAddress && tournamentId !== undefined && !!voter
    }
  });

  const stats = data ? {
    totalPowerUsed: (data as any[])[0] as bigint,
    totalVotes: (data as any[])[1] as bigint,
    uniqueProjectsVoted: (data as any[])[2] as bigint
  } as VoterStats : null;

  return {
    stats,
    isLoading,
    error,
    refetch
  };
}

// Hook for reading base token
export function useBaseToken(contractAddress: Address) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'baseToken',
    query: {
      enabled: !!contractAddress
    }
  });

  return {
    baseToken: data as Address,
    isLoading,
    error,
    refetch
  };
}

// Hook for reading paused status
export function usePaused(contractAddress: Address) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'paused',
    query: {
      enabled: !!contractAddress
    }
  });

  return {
    paused: data as boolean,
    isLoading,
    error,
    refetch
  };
}

// Hook for reading default constants
export function useTournamentDefaults(contractAddress: Address) {
  const { data, isLoading, error, refetch } = useReadContracts({
    contracts: [
      {
        address: contractAddress,
        abi,
        functionName: 'DEFAULT_AMOUNT_WEIGHT'
      },
      {
        address: contractAddress,
        abi,
        functionName: 'DEFAULT_TIME_WEIGHT'
      },
      {
        address: contractAddress,
        abi,
        functionName: 'DEFAULT_UNIQUENESS_WEIGHT'
      },
      {
        address: contractAddress,
        abi,
        functionName: 'DEFAULT_VOTER_REWARD_BPS'
      },
      {
        address: contractAddress,
        abi,
        functionName: 'DEFAULT_MIN_VOTE_AMOUNT'
      },
      {
        address: contractAddress,
        abi,
        functionName: 'DEFAULT_QF_PRECISION'
      }
    ],
    query: {
      enabled: !!contractAddress
    }
  });

  return {
    defaultAmountWeight: data?.[0]?.result as bigint,
    defaultTimeWeight: data?.[1]?.result as bigint,
    defaultUniquenessWeight: data?.[2]?.result as bigint,
    defaultVoterRewardBps: data?.[3]?.result as bigint,
    defaultMinVoteAmount: data?.[4]?.result as bigint,
    defaultQfPrecision: data?.[5]?.result as bigint,
    isLoading,
    error,
    refetch
  };
}

export default {
  // Write hooks
  useCreateTournament,
  useCreateTournamentAdvanced,
  useStartTournament,
  usePauseTournament,
  useUnpauseTournament,
  useAddProject,
  useAddProjectsBatch,
  useAddCampaignProjects,
  useRemoveProject,
  useRemoveProjectsBatch,
  useApproveProject,
  useApproveMultipleProjects,
  useBatchApproveProjects,
  useDisqualifyProject,
  useVoteWithCelo,
  useVoteWithToken,
  useBatchVoteWithCelo,
  useBatchVoteWithToken,
  useFundStageWithCelo,
  useFundStageWithToken,
  useScheduleNextStage,
  useStartScheduledStage,
  useStartNextStageManually,
  useFinalizeStage,
  useClaimVoterReward,
  useConvertTokensExternal,
  // Read hooks
  useNextTournamentId,
  useTournament,
  useTournamentConfig,
  useTournamentProjects,
  useApprovedProjects,
  useProjectStatus,
  useStageCount,
  useCurrentStageNumber,
  useStageInfo,
  useStageStatus,
  useCanFinalizeStage,
  useStageTokenAmount,
  useStageUsedTokens,
  useStageVoters,
  useStageFailedConversions,
  useLeaderboard,
  useProjectPower,
  useProjectExpectedReward,
  useHasVoted,
  useHasVotedInStage,
  useVoterVoteCount,
  useVoterVoteInStage,
  useVoterAllVotesInStage,
  useVoterHistory,
  useVoterLoyaltyStages,
  useVoterPendingReward,
  useUnclaimedRewards,
  useNextVoteDiminishingFactor,
  useEstimateVotePower,
  useVoterStats,
  useBaseToken,
  usePaused,
  useTournamentDefaults
};
