import { describe, it, expect } from 'vitest';
import { DomainError, EntityNotFoundError } from '../../src/domain/index.js';

describe('Domain Layer', () => {
  it('should instantiate DomainError correctly', () => {
    const error = new DomainError('Test domain rule failure');
    expect(error.name).toBe('DomainError');
    expect(error.message).toBe('Test domain rule failure');
  });

  it('should format EntityNotFoundError with entity name and ID', () => {
    const error = new EntityNotFoundError('Equipment', 'EQ-101');
    expect(error.name).toBe('EntityNotFoundError');
    expect(error.message).toBe("Equipment with ID 'EQ-101' was not found.");
  });
});
