import { describe, it, expect } from 'vitest';
import { Container } from '../../src/infrastructure/container.js';

describe('Dependency Injection Container', () => {
  it('should initialize container and resolve use cases via constructor injection', () => {
    const container = Container.create({
      databaseUrl: 'postgresql://localhost:5432/test',
      llmApiKey: 'test-key',
    });

    expect(container.equipmentRepository).toBeDefined();
    expect(container.llmProvider).toBeDefined();
    expect(container.reviewQueueGateway).toBeDefined();
    expect(container.diagnoseEquipmentUseCase).toBeDefined();
  });

  it('should allow use case execution through container dependencies', async () => {
    const container = Container.create();
    const result = await container.diagnoseEquipmentUseCase.execute({
      equipmentId: 'EQ-001',
      symptoms: 'High vibration on motor shaft',
    });

    expect(result.equipmentId).toBe('EQ-001');
    expect(result.diagnosis).toBeDefined();
    expect(result.queuedForHumanReview).toBe(false);
  });
});
