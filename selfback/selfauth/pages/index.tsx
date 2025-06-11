import type { NextPage } from 'next';
import Head from 'next/head';

const Home: NextPage = () => {
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
      </main>
    </div>
  );
};

export default Home;
