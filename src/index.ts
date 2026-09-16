import dotenv from 'dotenv';
import { Container } from './infrastructure/container.js';
import { createServer } from './api/server.js';

dotenv.config();

const config = {
  databaseUrl: process.env.DATABASE_URL,
  llmApiKey: process.env.OPENAI_API_KEY,
  llmModel: process.env.EMBEDDING_MODEL,
};

const container = Container.create(config);
const server = createServer(container);

const port = Number(process.env.PORT) || 3000;

server.start(port).catch((err) => {
  console.error('[Domain Copilot] Failed to start server:', err);
  process.exit(1);
});
