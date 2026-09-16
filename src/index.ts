import dotenv from 'dotenv';
import { Container } from './infrastructure/container.js';
import { createServer } from './api/server.js';

dotenv.config();

const config = {
  databaseUrl: process.env.DATABASE_URL,
  llmProvider: (process.env.LLM_PROVIDER as 'gemini' | 'ollama') || 'gemini',
  geminiApiKey: process.env.GEMINI_API_KEY,
  geminiModel: process.env.GEMINI_MODEL,
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL,
  ollamaModel: process.env.OLLAMA_MODEL,
};

const container = Container.create(config);
const server = createServer(container);

const port = Number(process.env.PORT) || 3000;

server.start(port).catch((err) => {
  console.error('[Domain Copilot] Failed to start server:', err);
  process.exit(1);
});
