import { IEquipmentRepository } from '../ports/equipment-repository.port.js';
import { ILLMProvider } from '../ports/llm-provider.port.js';
import { IReviewQueueGateway } from '../ports/review-queue.port.js';

export interface DiagnoseEquipmentInput {
  equipmentId: string;
  symptoms: string;
}

export interface DiagnoseEquipmentOutput {
  equipmentId: string;
  diagnosis: string;
  recommendedAction: string;
  queuedForHumanReview: boolean;
}

export class DiagnoseEquipmentUseCase {
  constructor(
    private readonly equipmentRepo: IEquipmentRepository,
    private readonly llmProvider: ILLMProvider,
    private readonly reviewQueue: IReviewQueueGateway
  ) {}

  // Skeleton method stub - business logic will be implemented in subsequent tasks
  async execute(_input: DiagnoseEquipmentInput): Promise<DiagnoseEquipmentOutput> {
    // Stub return
    return {
      equipmentId: _input.equipmentId,
      diagnosis: 'Skeleton diagnosis placeholder',
      recommendedAction: 'Skeleton action placeholder',
      queuedForHumanReview: false,
    };
  }
}
