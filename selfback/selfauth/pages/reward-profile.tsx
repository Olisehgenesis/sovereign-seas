import type { NextPage } from 'next';
import Head from 'next/head';
import { useEffect, useMemo, useState } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useEngagementRewards, REWARDS_CONTRACT } from '@goodsdks/engagement-sdk';
import { createPublicClient, formatEther, http } from 'viem';
import { celo } from 'viem/chains';

// balance fetched directly from chain (not via claim-vote)

const truncate = (addr?: string) => (addr ? `${addr.slice(0, 6)}...${addr.slice(-6)}` : '—');

const RewardProfile: NextPage = () => {
  const { ready, authenticated, user } = usePrivy();
  const { wallets } = useWallets();

  const walletAccount = useMemo(() => wallets?.[0], [wallets]);
  const address = useMemo(() => user?.wallet?.address ?? walletAccount?.address, [user?.wallet?.address, walletAccount?.address]);
  const isHexAddress = (a?: string): a is `0x${string}` => !!a && a.startsWith('0x');

  const rewardsAddress = REWARDS_CONTRACT;
  const engagementRewards = useEngagementRewards(rewardsAddress);
  const isUserRegisteredSafe = async (
    app: `0x${string}`,
    userAddress: `0x${string}`
  ): Promise<boolean> => {
    try {
      const maybe = engagementRewards as any;
      if (maybe && typeof maybe.isUserRegistered === 'function') {
        return await maybe.isUserRegistered(app, userAddress);
      }
    } catch {}
    return false;
  };

  const [eligible, setEligible] = useState<boolean | null>(null);
  const [registered, setRegistered] = useState<boolean | null>(null);
  const [pending, setPending] = useState<boolean>(false);
  const [claiming, setClaiming] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  // RAW debug values for test page
  const [rawCanClaim, setRawCanClaim] = useState<boolean | null>(null);
  const [rawIsRegistered, setRawIsRegistered] = useState<boolean | null>(null);
  const [rawCurrentBlock, setRawCurrentBlock] = useState<string | null>(null);
  const [rawValidUntilBlock, setRawValidUntilBlock] = useState<string | null>(null);
  const [rawUserSignature, setRawUserSignature] = useState<string | null>(null);
  const [rawAppSignature, setRawAppSignature] = useState<string | null>(null);
  const [rawReceipt, setRawReceipt] = useState<any | null>(null);

  const APP_ADDRESS = (process.env.NEXT_PUBLIC_APP_ADDRESS as `0x${string}`) || ("0x0000000000000000000000000000000000000000" as `0x${string}`);
  const INVITER_ADDRESS = (process.env.NEXT_PUBLIC_INVITER_ADDRESS as `0x${string}`) || APP_ADDRESS;

  useEffect(() => {
    const fetchBalance = async () => {
      if (!isHexAddress(address)) return;
      try {
        const pc = createPublicClient({ chain: celo, transport: http() });
        const wei = await pc.getBalance({ address });
        setBalance(Number(formatEther(wei)).toFixed(3));
      } catch {
        setBalance(null);
      }
    };
    fetchBalance();
  }, [address]);

  const refreshStatuses = async () => {
    if (!engagementRewards || !isHexAddress(address)) return;
    setError(null);
    try {
      const [can, isReg] = await Promise.all([
        engagementRewards.canClaim(APP_ADDRESS, address).catch(() => false),
        isUserRegisteredSafe(APP_ADDRESS, address).catch(() => false),
      ]);
      setRawCanClaim(can);
      setRawIsRegistered(isReg);
      setEligible(Boolean(can));
      setRegistered(Boolean(isReg));
    } catch (e: any) {
      setError(e?.message || 'Failed to refresh status');
    }
  };

  useEffect(() => {
    if (engagementRewards && address) {
      refreshStatuses();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Boolean(engagementRewards), address, rewardsAddress]);

  const handleClaim = async () => {
    if (!engagementRewards || !isHexAddress(address)) return;
    setError(null);
    setInfo(null);
    setClaiming(true);
    try {
      const currentBlock = await engagementRewards.getCurrentBlockNumber();
      const validUntilBlock = currentBlock + BigInt(10);
      setRawCurrentBlock(currentBlock?.toString?.() ?? String(currentBlock));
      setRawValidUntilBlock(validUntilBlock?.toString?.() ?? String(validUntilBlock));

      let userSignature: `0x${string}` = '0x';
      const isReg = await isUserRegisteredSafe(APP_ADDRESS, address);
      if (!isReg && typeof engagementRewards.signClaim === 'function') {
        userSignature = await engagementRewards.signClaim(APP_ADDRESS, INVITER_ADDRESS, validUntilBlock);
      }
      setRawUserSignature(userSignature);

      const res = await fetch('/api/sign-claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: address, validUntilBlock: validUntilBlock.toString(), inviter: INVITER_ADDRESS }),
      });
      if (!res.ok) throw new Error('Failed to get app signature');
      const { signature: appSignature } = await res.json();
      setRawAppSignature(appSignature);

      const receipt = await engagementRewards.nonContractAppClaim(
        APP_ADDRESS,
        INVITER_ADDRESS,
        validUntilBlock,
        userSignature,
        appSignature
      );
      setRawReceipt(receipt);
      setInfo(`Claim submitted: ${receipt?.transactionHash || ''}`);
      await refreshStatuses();
    } catch (e: any) {
      setError(e?.message || 'Claim failed');
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div>
      <Head>
        <title>Reward Profile</title>
      </Head>
      <main>
        <h1>Engagement Rewards</h1>
        {!ready ? (
          <p>Loading…</p>
        ) : !authenticated ? (
          <p>Please connect your wallet to view your reward profile.</p>
        ) : !engagementRewards ? (
          <div>
            <h2>Initializing rewards SDK…</h2>
            <p>Please wait a moment and try Refresh.</p>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 12 }}>
              <div>
                <div style={{ fontWeight: 600 }}>Reward Profile</div>
                <div style={{ fontSize: 12, color: '#666' }}>User +1</div>
              </div>
              <div style={{ marginLeft: 'auto', fontSize: 14 }}>
                <span style={{ marginRight: 8 }}>{balance ? `${balance} CELO` : '— CELO'}</span>
                <span>{truncate(address)}</span>
              </div>
            </div>

            {/* Dev contract enforced. Environment switch removed. */}

            <section style={{ border: '1px solid #eee', padding: 12, borderRadius: 8, marginBottom: 12 }}>
              <h3 style={{ margin: '4px 0' }}>Status</h3>
              <ul>
                <li><strong>Eligible</strong>: {eligible === null ? '—' : eligible ? 'Yes' : 'No'}</li>
                <li><strong>Registered</strong>: {registered === null ? '—' : registered ? 'Yes' : 'No'}</li>
                <li><strong>Invites</strong>: 0</li>
                <li><strong>Endpoint</strong>: /api/sign-claim</li>
                <li><strong>Contract (dev)</strong>: {rewardsAddress}</li>
                <li><strong>App</strong>: {APP_ADDRESS}</li>
                <li><strong>Inviter</strong>: {INVITER_ADDRESS}</li>
                <li><strong>Eligible (raw)</strong>: {rawCanClaim === null ? '—' : String(rawCanClaim)}</li>
                <li><strong>Registered (raw)</strong>: {rawIsRegistered === null ? '—' : String(rawIsRegistered)}</li>
              </ul>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button onClick={refreshStatuses} disabled={pending}>
                  Refresh
                </button>
                <button onClick={handleClaim} disabled={claiming || eligible === false || !isHexAddress(address)}>
                  {claiming ? 'Claiming…' : 'Claim Demo'}
                </button>
              </div>
              {error && <div style={{ color: 'red', marginTop: 8 }}>{error}</div>}
              {info && <div style={{ color: 'green', marginTop: 8 }}>{info}</div>}
            </section>

            <section style={{ border: '1px solid #eee', padding: 12, borderRadius: 8 }}>
              <h3 style={{ margin: '4px 0' }}>Last Claim (raw)</h3>
              <ul>
                <li><strong>currentBlock</strong>: {rawCurrentBlock ?? '—'}</li>
                <li><strong>validUntilBlock</strong>: {rawValidUntilBlock ?? '—'}</li>
                <li><strong>userSignature</strong>: {rawUserSignature ?? '—'}</li>
                <li><strong>appSignature</strong>: {rawAppSignature ?? '—'}</li>
              </ul>
              {rawReceipt && (
                <div>
                  <strong>receipt</strong>:
                  <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(rawReceipt, (_k, v) => (typeof v === 'bigint' ? v.toString() : v), 2)}</pre>
                </div>
              )}
            </section>

            <section style={{ border: '1px solid #eee', padding: 12, borderRadius: 8 }}>
              <h3 style={{ margin: '4px 0' }}>Integration Guide</h3>
              <ul style={{ marginTop: 6 }}>
                <li>Deploy and verify your contract on sourcify.dev</li>
                <li>Register and get approved in EngagementRewards</li>
                <li>Users must be whitelisted (GoodDollar Identity)</li>
                <li>Cooldown period: 180 days</li>
                <li>Use dev app at https://engagement-rewards-dev.vercel.app</li>
              </ul>
            </section>
          </div>
        )}
      </main>
    </div>
  );
};

export default RewardProfile;


