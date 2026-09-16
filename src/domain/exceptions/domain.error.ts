export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainError';
  }
}

export class EntityNotFoundError extends DomainError {
  constructor(entityName: string, id: string) {
    super(`${entityName} with ID '${id}' was not found.`);
    this.name = 'EntityNotFoundError';
  }
}

export class DomainValidationError extends DomainError {
  constructor(message: string) {
    super(message);
    this.name = 'DomainValidationError';
  }
}

export class UnacknowledgedSafetyPrerequisiteError extends DomainError {
  public readonly missingPrerequisiteIds: string[];

  constructor(missingPrerequisiteIds: string[]) {
    super(
      `Cannot transition work order to approval: missing safety prerequisites [${missingPrerequisiteIds.join(', ')}].`
    );
    this.name = 'UnacknowledgedSafetyPrerequisiteError';
    this.missingPrerequisiteIds = missingPrerequisiteIds;
  }
}
