import type { NextPage } from 'next';
import Head from 'next/head';
import { useEffect, useState } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import type { WalletWithMetadata, LinkedAccountWithMetadata } from '@privy-io/react-auth';

type VerificationResponse = {
  profile: {
    isValid: boolean;
    providers: string[];
    icons: Record<string, string>;
  };
  verified: boolean;
  gooddollar: { isVerified: boolean };
  self: {
    isVerified: boolean;
    nationality: string | null;
    attestationId: string | null;
    timestamp: string | null;
    userDefinedData: any | null;
    verificationOptions: {
      minimumAge: number;
      ofac: boolean;
      excludedCountries: string[];
      nationality: boolean;
      gender: boolean;
    } | null;
  };
};

const StatusPage: NextPage = () => {
  const { ready, authenticated, user, login, logout, connectOrCreateWallet } = usePrivy();
  const { wallets } = useWallets();

  const handleConnectWallet = async () => {
    await connectOrCreateWallet();
    const primary = wallets[0];
    if (primary && typeof primary.loginOrLink === 'function') {
      await primary.loginOrLink();
    }
  };
  const walletAccount = user?.linkedAccounts?.find(
    (a: LinkedAccountWithMetadata): a is WalletWithMetadata => a.type === 'wallet'
  );
  const address = user?.wallet?.address ?? walletAccount?.address;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<VerificationResponse | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      if (!authenticated || !address) return;
      setLoading(true);
      setError(null);
      setData(null);
      try {
        const res = await fetch(`/api/verify-details?wallet=${encodeURIComponent(address)}`);
        if (!res.ok) {
          throw new Error(`Failed to fetch status (${res.status})`);
        }
        const json = (await res.json()) as VerificationResponse;
        setData(json);
      } catch (err: any) {
        setError(err?.message || 'Failed to fetch status');
      } finally {
        setLoading(false);
      }
    };
    fetchStatus();
  }, [authenticated, address]);

  return (
    <div>
      <Head>
        <title>Status</title>
        <meta name="description" content="Wallet verification status" />
      </Head>

      <main>
        <h1>Wallet Status</h1>

        {!ready ? (
          <p>Loading…</p>
        ) : !authenticated ? (
          <div>
            <p>Please log in to view verification details.</p>
            <button onClick={handleConnectWallet} style={{ padding: '8px 12px' }}>Connect Wallet</button>
          </div>
        ) : (
          <div>
            <p><strong>Address:</strong> {address}</p>
            <button onClick={logout} style={{ padding: '6px 10px', marginBottom: 12 }}>Logout</button>
            {loading && <p>Loading status…</p>}
            {error && <p style={{ color: 'red' }}>{error}</p>}
            {data && (
              <div style={{ marginTop: 12 }}>
                <p><strong>Overall Verified:</strong> {data.verified ? 'Yes' : 'No'}</p>
                <p><strong>Providers:</strong> {data.profile.providers.join(', ') || 'None'}</p>
                <h3>Self Verification</h3>
                <ul>
                  <li><strong>Verified:</strong> {data.self.isVerified ? 'Yes' : 'No'}</li>
                  <li><strong>Nationality:</strong> {data.self.nationality ?? '—'}</li>
                  <li><strong>Attestation ID:</strong> {data.self.attestationId ?? '—'}</li>
                  <li><strong>Timestamp:</strong> {data.self.timestamp ?? '—'}</li>
                </ul>
                <h3>GoodDollar</h3>
                <ul>
                  <li><strong>Verified:</strong> {data.gooddollar?.isVerified ? 'Yes' : 'No'}</li>
                </ul>
                {data.self.userDefinedData && (
                  <div>
                    <strong>User Data:</strong>
                    <pre style={{ whiteSpace: 'pre-wrap' }}>
{JSON.stringify(data.self.userDefinedData, null, 2)}
                    </pre>
                  </div>
                )}
                {data.self.verificationOptions && (
                  <div>
                    <strong>Verification Options:</strong>
                    <pre style={{ whiteSpace: 'pre-wrap' }}>
{JSON.stringify(data.self.verificationOptions, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default StatusPage;


