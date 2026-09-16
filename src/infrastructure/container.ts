import { IEquipmentRepository } from '../application/ports/equipment-repository.port.js';
import { ILLMProvider } from '../application/ports/llm-provider.port.js';
import { IReviewQueueGateway } from '../application/ports/review-queue.port.js';
import { DiagnoseEquipmentUseCase } from '../application/usecases/diagnose-equipment.usecase.js';
import { PostgresEquipmentRepository } from './database/postgres-equipment.repository.js';
import { GeminiLLMProvider } from './llm/gemini-llm.provider.js';
import { InMemoryReviewQueueGateway } from './review-queue/in-memory-review-queue.gateway.js';

export interface AppConfig {
  databaseUrl?: string;
  llmApiKey?: string;
  llmModel?: string;
}

export class Container {
  // Ports / Adapters
  readonly equipmentRepository: IEquipmentRepository;
  readonly llmProvider: ILLMProvider;
  readonly reviewQueueGateway: IReviewQueueGateway;

  // Use Cases
  readonly diagnoseEquipmentUseCase: DiagnoseEquipmentUseCase;

  constructor(config: AppConfig = {}) {
    // 1. Instantiate Adapters (Infrastructure)
    this.equipmentRepository = new PostgresEquipmentRepository(config.databaseUrl);
    this.llmProvider = new GeminiLLMProvider({
      apiKey: config.llmApiKey,
      model: config.llmModel,
    });
    this.reviewQueueGateway = new InMemoryReviewQueueGateway();

    // 2. Wire Use Cases via Constructor Injection (Application)
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
