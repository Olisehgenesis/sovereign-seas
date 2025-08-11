import type { NextPage } from 'next';
import Head from 'next/head';
import { usePrivy, useWallets } from '@privy-io/react-auth';

const Home: NextPage = () => {
  const { ready, authenticated, login, logout, user, connectOrCreateWallet } = usePrivy();
  const { wallets } = useWallets();

  const handleConnectWallet = async () => {
    await connectOrCreateWallet();
    const primary = wallets[0];
    if (primary && typeof primary.loginOrLink === 'function') {
      await primary.loginOrLink();
    }
  };
  return (
    <div>
      <Head>
        <title>Welcome</title>
        <meta name="description" content="Welcome to the API" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        <h1>Welcome to the API</h1>
        <p>This is a backend-only application. Please use the API endpoints:</p>
        <ul>
          <li>GET /api/health - Health check endpoint</li>
          <li>POST /api/verify - Verification endpoint</li>
          <li>POST /api/get-stats - Statistics endpoint</li>
        </ul>
        <div style={{ marginTop: 24 }}>
          {!ready ? (
            <span>Loading…</span>
          ) : authenticated ? (
            <>
              <div style={{ marginBottom: 8 }}>Logged in as {user?.email?.address || user?.wallet?.address || 'user'}</div>
              <button onClick={logout} style={{ padding: '8px 12px' }}>Logout</button>
            </>
          ) : (
            <div>
              <div style={{ marginBottom: 6, fontSize: 14, color: '#555' }}>Connect your wallet to continue</div>
              <button onClick={handleConnectWallet} style={{ padding: '8px 12px' }}>
                Connect Wallet
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Home;
