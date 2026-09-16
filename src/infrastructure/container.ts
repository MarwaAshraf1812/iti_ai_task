import { IEquipmentRepository } from '../application/ports/equipment-repository.port.js';
import { ILLMProvider } from '../application/ports/llm-provider.port.js';
import { IReviewQueueGateway } from '../application/ports/review-queue.port.js';
import { DiagnoseEquipmentUseCase } from '../application/usecases/diagnose-equipment.usecase.js';
import { PostgresEquipmentRepository } from './database/postgres-equipment.repository.js';
import { GeminiLLMProvider } from './llm/gemini-llm.provider.js';
import { OllamaLLMProvider } from './llm/ollama-llm.provider.js';
import { ResilientLLMProvider } from './llm/resilient-llm.provider.js';
import { InMemoryReviewQueueGateway } from './review-queue/in-memory-review-queue.gateway.js';

export interface AppConfig {
  databaseUrl?: string;
  llmProvider?: 'gemini' | 'ollama';
  geminiApiKey?: string;
  geminiModel?: string;
  ollamaBaseUrl?: string;
  ollamaModel?: string;
  llmTimeoutMs?: number;
  primaryLLMProvider?: ILLMProvider;
  fallbackLLMProvider?: ILLMProvider;
}

export class Container {
  // Ports / Adapters
  readonly equipmentRepository: IEquipmentRepository;
  readonly llmProvider: ILLMProvider;
  readonly reviewQueueGateway: IReviewQueueGateway;

  // Use Cases
  readonly diagnoseEquipmentUseCase: DiagnoseEquipmentUseCase;

  constructor(config: AppConfig = {}) {
    // 1. Instantiate Repositories and Gateways
    this.equipmentRepository = new PostgresEquipmentRepository(config.databaseUrl);
    this.reviewQueueGateway = new InMemoryReviewQueueGateway();

    // 2. Wire Resilient LLM Provider (Primary + Fallback)
    const selectedProvider =
      config.llmProvider ||
      (process.env.LLM_PROVIDER?.toLowerCase() === 'ollama' ? 'ollama' : 'gemini');

    const gemini = new GeminiLLMProvider({
      apiKey: config.geminiApiKey || process.env.GEMINI_API_KEY,
      model: config.geminiModel || process.env.GEMINI_MODEL,
    });

    const ollama = new OllamaLLMProvider({
      baseUrl: config.ollamaBaseUrl || process.env.OLLAMA_BASE_URL,
      model: config.ollamaModel || process.env.OLLAMA_MODEL,
    });

    const primary =
      config.primaryLLMProvider || (selectedProvider === 'ollama' ? ollama : gemini);
    const fallback =
      config.fallbackLLMProvider || (selectedProvider === 'ollama' ? gemini : ollama);

    this.llmProvider = new ResilientLLMProvider({
      primary,
      fallback,
      primaryName: selectedProvider,
      fallbackName: selectedProvider === 'ollama' ? 'gemini' : 'ollama',
      timeoutMs: config.llmTimeoutMs || 10000,
    });

    // 3. Wire Use Cases via Constructor Injection (Application)
    this.diagnoseEquipmentUseCase = new DiagnoseEquipmentUseCase(
      this.equipmentRepository,
      this.llmProvider,
      this.reviewQueueGateway
    );
  }

  // Factory helper for clean bootstrapping
  static create(config: AppConfig = {}): Container {
    return new Container(config);
  }
}
