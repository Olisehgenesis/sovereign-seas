import Fastify from 'fastify';
import fastifyVite from '@fastify/vite';
import fastifyCors from '@fastify/cors';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize SQLite database
const db = new Database('verifications.db');
db.exec(`
  CREATE TABLE IF NOT EXISTS verifications (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    options TEXT,
    verified BOOLEAN DEFAULT false,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

const server = Fastify({
  logger: true
});

// Register CORS
await server.register(fastifyCors, {
  origin: true // Allow all origins in development
});

// Register Vite
await server.register(fastifyVite as any, {
  root: join(__dirname, '..'),
  dev: process.env.NODE_ENV !== 'production',
  spa: true
});

// Verification endpoint
server.post('/api/verify', async (request, reply) => {
  try {
    const { proof, publicSignals } = request.body as any;

    if (!proof || !publicSignals) {
      return reply.status(400).send({ message: 'Proof and publicSignals are required' });
    }

    // Here you would implement your verification logic
    // For now, we'll just store the verification attempt
    const userId = publicSignals.userId || 'unknown';
    
    db.prepare(`
      INSERT INTO verifications (id, userId, verified)
      VALUES (?, ?, ?)
    `).run(crypto.randomUUID(), userId, true);

    return reply.send({
      status: 'success',
      result: true,
      message: 'Verification successful'
    });
  } catch (error) {
    server.log.error(error);
    return reply.status(500).send({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// Start server
try {
  await server.listen({ port: 3000, host: '0.0.0.0' });
  console.log('Server running at http://localhost:3000');
} catch (err) {
  server.log.error(err);
  process.exit(1);
} 