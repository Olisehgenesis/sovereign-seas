import { useCallback, useMemo } from 'react'
import {
  useAccount,
  useReadContract,
  useReadContracts,
  useSendTransaction
} from 'wagmi'
import type { Abi, Address, Hex } from 'viem'
import { formatEther, hexToString, stringToHex } from 'viem'
import { builderRewardsNFTAbi } from '@/abi/nfts'
import { executeTransactionWithDivvi, logDivviOperation } from '@/utils/divvi'
import { getBuilderRewardsContractAddress } from '@/utils/contractConfig'
import { useChainSwitch } from './useChainSwitch'

const DEFAULT_CONTRACT_ADDRESS = getBuilderRewardsContractAddress() as Address
const BUILDER_REWARDS_ABI = builderRewardsNFTAbi as unknown as Abi
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as Address
const FRAGMENTS_PER_SLOT = 27n
const MIN_FRAGMENT_PRICE_WEI = 2n * 10n ** 18n // 2 CELO
const MIN_BID_DURATION_SECONDS = 60 * 60 // 1 hour
const MAX_BID_DURATION_SECONDS = 60 * 60 * 24 * 30 // 30 days

const tierLabels: Record<number, string> = {
  1: 'Cadet',
  2: 'Navigator',
  3: 'Captain',
  4: 'Fleet Admiral'
}

const rarityLabels: Record<number, string> = {
  1: 'common',
  2: 'rare',
  3: 'epic',
  4: 'legendary'
}

const looksLikeBase64 = (value: string) => /^[A-Za-z0-9+/=]+$/.test(value.replace(/\s+/g, ''))

type BufferLike = {
  from: (input: string, encoding: string) => { toString: (encoding: string) => string }
}

const decodeBase64 = (value: string): string | null => {
  try {
    if (typeof atob === 'function') {
      const binary = atob(value)
      const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
      return new TextDecoder().decode(bytes)
    }
  } catch (error) {
    console.warn('Failed to decode base64 via atob:', error)
  }

  try {
    const candidate = (globalThis as unknown as { Buffer?: BufferLike }).Buffer
    if (candidate?.from) {
      return candidate.from(value, 'base64').toString('utf8')
    }
  } catch (error) {
    console.warn('Failed to decode base64 via Buffer shim:', error)
  }

  return null
}

const safeJsonParse = (value?: string | null) => {
  if (!value) return undefined
  try {
    return JSON.parse(value)
  } catch {
    return undefined
  }
}

export interface BuilderProfileMetadata {
  name?: string
  handle?: string
  rarity?: string
  avatar?: string
  banner?: string
  headline?: string
  description?: string
  tagline?: string
  location?: string
  specialties?: string[]
  skills?: string[]
  tags?: string[]
  socials?: Record<string, string>
  links?: Record<string, string>
  badges?: string[]
  stats?: Record<string, string | number>
  highlights?: string[]
  experience?: string[]
  achievements?: string[]
  raw?: string
  json?: Record<string, any>
}

export interface BuilderSlotView {
  id: bigint
  builder: Address
  projectCount: number
  tier: number
  fragmentsSold: number
  fragmentPrice: bigint
  flowPrice: bigint
  metadataHex: Hex
  metadata?: BuilderProfileMetadata
  active: boolean
  fragmentsRemaining: number
  soldOut: boolean
  tierLabel: string
  rarityLabel: string
  fragmentPriceFormatted: string
  flowPriceFormatted: string
  progress: number
}

export interface BuilderBid {
  id: bigint
  bidder: Address
  amount: bigint
  pricePerFragment: bigint
  expiry: bigint
  active: boolean
  totalValue: bigint
  pricePerFragmentFormatted: string
  totalValueFormatted: string
  expiresInSeconds: number
}

export type BuilderMetadataInput =
  | string
  | BuilderProfileMetadata
  | Hex
  | Record<string, any>

export interface BuilderRewardsListOptions {
  offset?: number
  limit?: number
  addressOverride?: Address
}

export interface RegisterBuilderSlotParams {
  projectIds: bigint[]
  fragmentPrice: bigint
  flowPrice: bigint
  metadata: BuilderMetadataInput
}

export interface UpdatePriceParams {
  builderId: bigint
  newPrice: bigint
}

export interface UpdateMetadataParams {
  builderId: bigint
  metadata: BuilderMetadataInput
}

export interface BuyFragmentsParams {
  builderId: bigint
  amount: bigint
  fragmentPriceWei: bigint
}

export interface PlaceBidParams {
  builderId: bigint
  amount: bigint
  pricePerFragment: bigint
  expiry?: bigint
  durationSeconds?: number
}

export interface AcceptBidParams {
  builderId: bigint
  bidId: bigint
  amount: bigint
}

const encodeMetadata = (metadata: BuilderMetadataInput): Hex => {
  if (!metadata) {
    throw new Error('Builder metadata payload is required')
  }

  if (typeof metadata === 'string') {
    if (metadata.startsWith('0x')) {
      return metadata as Hex
    }
    return stringToHex(metadata)
  }

  if (typeof metadata === 'object' && 'raw' in metadata && typeof metadata.raw === 'string') {
    return encodeMetadata((metadata as BuilderProfileMetadata).raw as string)
  }

  return stringToHex(JSON.stringify(metadata))
}

const decodeMetadata = (metadata: Hex | string | undefined, tier?: number): BuilderProfileMetadata | undefined => {
  if (!metadata || metadata === '0x') return undefined

  let stringValue = metadata

  if (stringValue.startsWith('0x')) {
    try {
      stringValue = hexToString(stringValue as Hex)
    } catch (error) {
      console.warn('Failed to convert metadata hex to string:', error)
      return undefined
    }
  }

  stringValue = stringValue.trim()
  if (!stringValue) return undefined

  let parsed = safeJsonParse(stringValue)

  if (!parsed && looksLikeBase64(stringValue) && stringValue.length % 4 === 0) {
    const decoded = decodeBase64(stringValue)
    parsed = safeJsonParse(decoded || undefined)
    if (parsed) {
      stringValue = JSON.stringify(parsed)
    } else if (decoded) {
      stringValue = decoded
    }
  }

  const metadataObject: BuilderProfileMetadata = {
    ...(parsed ?? {}),
    raw: parsed ? JSON.stringify(parsed) : stringValue,
    json: parsed
  }

  const fallbackRarity = tier ? rarityLabels[tier] : undefined

  return {
    ...metadataObject,
    name: metadataObject.name || metadataObject.handle,
    rarity: metadataObject.rarity || fallbackRarity
  }
}

const normalizeSlot = (builderId: bigint, rawSlot?: any): BuilderSlotView | undefined => {
  if (!rawSlot) return undefined
  const [
    builder,
    projectCount,
    tier,
    fragmentsSold,
    fragmentPrice,
    flowPrice,
    metadata,
    active
  ] = rawSlot as [
    Address,
    bigint,
    bigint,
    bigint,
    bigint,
    bigint,
    Hex,
    boolean
  ]

  const fragmentsRemaining = Number(FRAGMENTS_PER_SLOT - fragmentsSold)
  const metadataView = decodeMetadata(metadata, Number(tier))

  return {
    id: builderId,
    builder,
    projectCount: Number(projectCount),
    tier: Number(tier),
    fragmentsSold: Number(fragmentsSold),
    fragmentPrice,
    flowPrice,
    metadataHex: metadata,
    metadata: metadataView,
    active,
    fragmentsRemaining,
    soldOut: fragmentsRemaining <= 0,
    tierLabel: tierLabels[Number(tier)] ?? `Tier ${Number(tier)}`,
    rarityLabel: metadataView?.rarity || rarityLabels[Number(tier)] || 'common',
    fragmentPriceFormatted: formatEther(fragmentPrice),
    flowPriceFormatted: formatEther(flowPrice),
    progress: Number(fragmentsSold) / Number(FRAGMENTS_PER_SLOT)
  }
}

const normalizeBid = (bidId: bigint, rawBid?: any): BuilderBid | undefined => {
  if (!rawBid) return undefined
  const [bidder, amount, pricePerFragment, expiry, active] = rawBid as [
    Address,
    bigint,
    bigint,
    bigint,
    boolean
  ]

  if (amount === 0n && !active) {
    return undefined
  }

  const totalValue = amount * pricePerFragment
  const now = BigInt(Math.floor(Date.now() / 1000))

  return {
    id: bidId,
    bidder,
    amount,
    pricePerFragment,
    expiry,
    active,
    totalValue,
    pricePerFragmentFormatted: formatEther(pricePerFragment),
    totalValueFormatted: formatEther(totalValue),
    expiresInSeconds: Number(expiry > now ? expiry - now : 0n)
  }
}

export const useBuilderRewardsAddress = (addressOverride?: Address) =>
  useMemo(() => (addressOverride ?? DEFAULT_CONTRACT_ADDRESS) as Address, [addressOverride])

export function useBuilderCount(addressOverride?: Address) {
  const address = useBuilderRewardsAddress(addressOverride)
  const { data, ...rest } = useReadContract({
    address,
    abi: BUILDER_REWARDS_ABI,
    functionName: 'getBuilderCount'
  })

  return {
    builderCount: Number(data ?? 0n),
    raw: data,
    ...rest
  }
}

export function useBuilderIds(
  { offset = 0, limit = 12, addressOverride }: BuilderRewardsListOptions = {}
) {
  const address = useBuilderRewardsAddress(addressOverride)
  const offsetBig = BigInt(offset)
  const limitBig = BigInt(limit)

  const query = useReadContract({
    address,
    abi: BUILDER_REWARDS_ABI,
    functionName: 'getBuilderIds',
    args: [offsetBig, limitBig],
    query: {
      enabled: limitBig > 0n
    }
  })

  const builderIds = useMemo(
    () => (query.data as bigint[] | undefined)?.map((id) => BigInt(id)) ?? [],
    [query.data]
  )

  return {
    ...query,
    builderIds
  }
}

export function useBuilderSlot(builderId?: bigint, addressOverride?: Address) {
  const address = useBuilderRewardsAddress(addressOverride)
  const query = useReadContract({
    address,
    abi: BUILDER_REWARDS_ABI,
    functionName: 'getBuilderSlot',
    args: [builderId ?? 0n],
    query: {
      enabled: !!builderId
    }
  })

  const slot = useMemo(() => (builderId ? normalizeSlot(builderId, query.data) : undefined), [
    builderId,
    query.data
  ])

  return {
    ...query,
    slot
  }
}

export function useBuilderSlotForOwner(owner?: Address, addressOverride?: Address) {
  const address = useBuilderRewardsAddress(addressOverride)

  const builderIdQuery = useReadContract({
    address,
    abi: BUILDER_REWARDS_ABI,
    functionName: 'builderIds',
    args: [owner ?? ZERO_ADDRESS],
    query: {
      enabled: !!owner
    }
  })

  const builderId = (builderIdQuery.data as bigint | undefined) ?? 0n
  const slotQuery = useBuilderSlot(builderId > 0n ? builderId : undefined, address)

  return {
    builderId,
    ...slotQuery
  }
}

export function useBuilderSlots(options?: BuilderRewardsListOptions) {
  const { offset = 0, limit = 12, addressOverride } = options ?? {}
  const address = useBuilderRewardsAddress(addressOverride)

  const { builderIds, refetch: refetchIds, isLoading: loadingIds } = useBuilderIds({
    offset,
    limit,
    addressOverride: address
  })

  const contracts = useMemo(
    () =>
      builderIds.map((id) => ({
        address,
        abi: BUILDER_REWARDS_ABI,
        functionName: 'getBuilderSlot',
        args: [id]
      })),
    [address, builderIds]
  )

  const {
    data: slotResults,
    refetch: refetchSlots,
    isLoading: loadingSlots,
    error
  } = useReadContracts({
    contracts,
    allowFailure: true,
    query: {
      enabled: builderIds.length > 0
    }
  })

  const slots = useMemo(
    () =>
      slotResults
        ?.map((result, index) => normalizeSlot(builderIds[index], result?.result))
        .filter(Boolean) as BuilderSlotView[] | undefined,
    [slotResults, builderIds]
  )

  const refetch = useCallback(async () => {
    await Promise.all([refetchIds?.(), refetchSlots?.()])
  }, [refetchIds, refetchSlots])

  return {
    contractAddress: address,
    builderIds,
    slots: slots ?? [],
    isLoading: loadingIds || loadingSlots,
    error,
    refetch
  }
}

export function useBuilderActiveBids(
  builderId?: bigint,
  limit = 20,
  addressOverride?: Address
) {
  const address = useBuilderRewardsAddress(addressOverride)

  const nextBidQuery = useReadContract({
    address,
    abi: BUILDER_REWARDS_ABI,
    functionName: 'nextBidId',
    args: [builderId ?? 0n],
    query: {
      enabled: !!builderId
    }
  })

  const latestBidId = Number(nextBidQuery.data ?? 0n)
  const idsToFetch = useMemo(() => {
    if (!builderId || latestBidId === 0) return []
    const count = Math.min(limit, latestBidId)
    return Array.from({ length: count }, (_, idx) => BigInt(latestBidId - idx - 1))
  }, [builderId, latestBidId, limit])

  const { data, isLoading, refetch } = useReadContracts({
    contracts: idsToFetch.map((bidId) => ({
      address,
        abi: BUILDER_REWARDS_ABI,
      functionName: 'bids',
      args: [builderId ?? 0n, bidId]
    })),
    allowFailure: true,
    query: {
      enabled: !!builderId && idsToFetch.length > 0
    }
  })

  const bids = useMemo(
    () =>
      data
        ?.map((entry, idx) => normalizeBid(idsToFetch[idx], entry?.result))
        .filter((bid): bid is BuilderBid => Boolean(bid && bid.active && bid.amount > 0n)) ?? [],
    [data, idsToFetch]
  )

  return {
    bids,
    isLoading,
    refetch
  }
}

export function useBuilderFragmentBalance(
  builderId?: bigint,
  accountOverride?: Address,
  addressOverride?: Address
) {
  const address = useBuilderRewardsAddress(addressOverride)
  const { address: userAddress } = useAccount()
  const holder = accountOverride ?? userAddress ?? ZERO_ADDRESS

  const query = useReadContract({
    address,
    abi: BUILDER_REWARDS_ABI,
    functionName: 'balanceOf',
    args: [holder, builderId ?? 0n],
    query: {
      enabled: !!builderId && holder !== ZERO_ADDRESS
    }
  })

  return {
    ...query,
    balance: (query.data as bigint | undefined) ?? 0n
  }
}

export function useBuilderRewardsActions(addressOverride?: Address) {
  const contractAddress = useBuilderRewardsAddress(addressOverride)
  const { ensureCorrectChain } = useChainSwitch()
  const { address: userAddress } = useAccount()
  const { sendTransactionAsync } = useSendTransaction()

  const requireUser = () => {
    if (!userAddress) throw new Error('Connect your wallet to continue')
  }

  const registerBuilderSlot = useCallback(
    async ({ projectIds, fragmentPrice, flowPrice, metadata }: RegisterBuilderSlotParams) => {
      requireUser()
      if (!projectIds?.length) {
        throw new Error('At least one projectId is required')
      }
      if (fragmentPrice < MIN_FRAGMENT_PRICE_WEI || flowPrice < MIN_FRAGMENT_PRICE_WEI) {
        throw new Error('Fragment price and flow price must be at least 2 CELO')
      }

      const metadataPayload = encodeMetadata(metadata)
      const sortedProjects = [...projectIds].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))

      await ensureCorrectChain()

      const tx = await executeTransactionWithDivvi(
        contractAddress,
        BUILDER_REWARDS_ABI,
        'registerBuilderSlot',
        [sortedProjects, fragmentPrice, flowPrice, metadataPayload],
        userAddress as Address,
        sendTransactionAsync
      )

      logDivviOperation(
        'BUILDER_REGISTER_SLOT',
        { tx, fragmentPrice: fragmentPrice.toString(), flowPrice: flowPrice.toString() },
        'success'
      )

      return tx
    },
    [contractAddress, ensureCorrectChain, sendTransactionAsync, userAddress]
  )

  const updateFragmentPrice = useCallback(
    async ({ builderId, newPrice }: UpdatePriceParams) => {
      requireUser()
      if (newPrice < MIN_FRAGMENT_PRICE_WEI) {
        throw new Error('New fragment price must be at least 2 CELO')
      }

      await ensureCorrectChain()

      const tx = await executeTransactionWithDivvi(
        contractAddress,
        BUILDER_REWARDS_ABI,
        'updateFragmentPrice',
        [builderId, newPrice],
        userAddress as Address,
        sendTransactionAsync
      )

      logDivviOperation(
        'BUILDER_UPDATE_FRAGMENT_PRICE',
        { tx, builderId: builderId.toString(), newPrice: newPrice.toString() },
        'success'
      )

      return tx
    },
    [contractAddress, ensureCorrectChain, sendTransactionAsync, userAddress]
  )

  const updateFlowPrice = useCallback(
    async ({ builderId, newPrice }: UpdatePriceParams) => {
      requireUser()
      if (newPrice < MIN_FRAGMENT_PRICE_WEI) {
        throw new Error('New flow price must be at least 2 CELO')
      }

      await ensureCorrectChain()

      const tx = await executeTransactionWithDivvi(
        contractAddress,
        BUILDER_REWARDS_ABI,
        'updateFlowPrice',
        [builderId, newPrice],
        userAddress as Address,
        sendTransactionAsync
      )

      logDivviOperation(
        'BUILDER_UPDATE_FLOW_PRICE',
        { tx, builderId: builderId.toString(), newPrice: newPrice.toString() },
        'success'
      )

      return tx
    },
    [contractAddress, ensureCorrectChain, sendTransactionAsync, userAddress]
  )

  const setBuilderSlotStatus = useCallback(
    async (builderId: bigint, active: boolean) => {
      requireUser()
      await ensureCorrectChain()

      const functionName = active ? 'activateBuilderSlot' : 'deactivateBuilderSlot'

      const tx = await executeTransactionWithDivvi(
        contractAddress,
        BUILDER_REWARDS_ABI,
        functionName,
        [builderId],
        userAddress as Address,
        sendTransactionAsync
      )

      logDivviOperation(
        'BUILDER_UPDATE_STATUS',
        { tx, builderId: builderId.toString(), active },
        'success'
      )

      return tx
    },
    [contractAddress, ensureCorrectChain, sendTransactionAsync, userAddress]
  )

  const updateMetadataForSlot = useCallback(
    async ({ builderId, metadata }: UpdateMetadataParams) => {
      requireUser()
      const payload = encodeMetadata(metadata)
      await ensureCorrectChain()

      const tx = await executeTransactionWithDivvi(
        contractAddress,
        BUILDER_REWARDS_ABI,
        'updateMetadataForSlot',
        [builderId, payload],
        userAddress as Address,
        sendTransactionAsync
      )

      logDivviOperation(
        'BUILDER_UPDATE_METADATA',
        { tx, builderId: builderId.toString() },
        'success'
      )

      return tx
    },
    [contractAddress, ensureCorrectChain, sendTransactionAsync, userAddress]
  )

  const buyFragments = useCallback(
    async ({ builderId, amount, fragmentPriceWei }: BuyFragmentsParams) => {
      requireUser()
      if (amount <= 0n) throw new Error('Amount must be greater than zero')
      if (fragmentPriceWei < MIN_FRAGMENT_PRICE_WEI) throw new Error('Fragment price below minimum')

      await ensureCorrectChain()
      const totalCost = fragmentPriceWei * amount

      const tx = await executeTransactionWithDivvi(
        contractAddress,
        BUILDER_REWARDS_ABI,
        'buyFragments',
        [builderId, amount],
        userAddress as Address,
        sendTransactionAsync,
        { value: totalCost }
      )

      logDivviOperation(
        'BUILDER_PURCHASE_FRAGMENTS',
        {
          tx,
          builderId: builderId.toString(),
          amount: amount.toString(),
          totalCost: totalCost.toString()
        },
        'success'
      )

      return tx
    },
    [contractAddress, ensureCorrectChain, sendTransactionAsync, userAddress]
  )

  const placeBid = useCallback(
    async ({ builderId, amount, pricePerFragment, expiry, durationSeconds = 86400 }: PlaceBidParams) => {
      requireUser()
      if (amount <= 0n) throw new Error('Bid amount must be greater than zero')
      if (pricePerFragment < MIN_FRAGMENT_PRICE_WEI) {
        throw new Error('Bid price below minimum flow price')
      }

      const duration = expiry
        ? Number(expiry - BigInt(Math.floor(Date.now() / 1000)))
        : durationSeconds
      if (duration < MIN_BID_DURATION_SECONDS || duration > MAX_BID_DURATION_SECONDS) {
        throw new Error('Bid duration must be between 1 hour and 30 days')
      }

      const bidExpiry =
        expiry ??
        BigInt(Math.floor(Date.now() / 1000) + Math.min(Math.max(durationSeconds, MIN_BID_DURATION_SECONDS), MAX_BID_DURATION_SECONDS))

      const escrow = pricePerFragment * amount

      await ensureCorrectChain()

      const tx = await executeTransactionWithDivvi(
        contractAddress,
        BUILDER_REWARDS_ABI,
        'placeBid',
        [builderId, amount, pricePerFragment, bidExpiry],
        userAddress as Address,
        sendTransactionAsync,
        { value: escrow }
      )

      logDivviOperation(
        'BUILDER_PLACE_BID',
        {
          tx,
          builderId: builderId.toString(),
          amount: amount.toString(),
          pricePerFragment: pricePerFragment.toString()
        },
        'success'
      )

      return tx
    },
    [contractAddress, ensureCorrectChain, sendTransactionAsync, userAddress]
  )

  const cancelBid = useCallback(
    async (builderId: bigint, bidId: bigint) => {
      requireUser()
      await ensureCorrectChain()

      const tx = await executeTransactionWithDivvi(
        contractAddress,
        BUILDER_REWARDS_ABI,
        'cancelBid',
        [builderId, bidId],
        userAddress as Address,
        sendTransactionAsync
      )

      logDivviOperation(
        'BUILDER_CANCEL_BID',
        { tx, builderId: builderId.toString(), bidId: bidId.toString() },
        'success'
      )

      return tx
    },
    [contractAddress, ensureCorrectChain, sendTransactionAsync, userAddress]
  )

  const cancelExpiredBid = useCallback(
    async (builderId: bigint, bidId: bigint) => {
      requireUser()
      await ensureCorrectChain()

      const tx = await executeTransactionWithDivvi(
        contractAddress,
        BUILDER_REWARDS_ABI,
        'cancelExpiredBid',
        [builderId, bidId],
        userAddress as Address,
        sendTransactionAsync
      )

      logDivviOperation(
        'BUILDER_CANCEL_EXPIRED_BID',
        { tx, builderId: builderId.toString(), bidId: bidId.toString() },
        'success'
      )

      return tx
    },
    [contractAddress, ensureCorrectChain, sendTransactionAsync, userAddress]
  )

  const acceptBid = useCallback(
    async ({ builderId, bidId, amount }: AcceptBidParams) => {
      requireUser()
      if (amount <= 0n) throw new Error('Amount must be greater than zero')
      await ensureCorrectChain()

      const tx = await executeTransactionWithDivvi(
        contractAddress,
        BUILDER_REWARDS_ABI,
        'acceptBid',
        [builderId, bidId, amount],
        userAddress as Address,
        sendTransactionAsync
      )

      logDivviOperation(
        'BUILDER_ACCEPT_BID',
        {
          tx,
          builderId: builderId.toString(),
          bidId: bidId.toString(),
          amount: amount.toString()
        },
        'success'
      )

      return tx
    },
    [contractAddress, ensureCorrectChain, sendTransactionAsync, userAddress]
  )

  return {
    contractAddress,
    registerBuilderSlot,
    updateFragmentPrice,
    updateFlowPrice,
    setBuilderSlotStatus,
    updateMetadataForSlot,
    buyFragments,
    placeBid,
    cancelBid,
    cancelExpiredBid,
    acceptBid
  }
}

export function useBuilderRewards(options?: BuilderRewardsListOptions) {
  const data = useBuilderSlots(options)
  const actions = useBuilderRewardsActions(options?.addressOverride)

  return {
    ...data,
    actions
  }
}

export default useBuilderRewards

