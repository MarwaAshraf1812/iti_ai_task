import { describe, it, expect } from 'vitest';
import {
  DomainError,
  EntityNotFoundError,
  UnacknowledgedSafetyPrerequisiteError,
  WorkOrder,
  DiagnosticStep,
  SafetyAcknowledgement,
} from '../../src/domain/index.js';

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

  describe('D5 WorkOrder Safety Enforcement', () => {
    const sampleStepsWithSafety: DiagnosticStep[] = [
      {
        id: 'STEP-1',
        order: 1,
        instruction: 'Isolate main breaker and apply lockout/tagout (LOTO)',
        requiresSafetyCheck: true,
        linkedSafetyPrerequisiteIds: ['PREREQ-LOTO-01', 'PREREQ-PPE-01'],
      },
      {
        id: 'STEP-2',
        order: 2,
        instruction: 'Verify zero voltage on motor terminals',
        requiresSafetyCheck: true,
        linkedSafetyPrerequisiteIds: ['PREREQ-VOLT-01'],
      },
    ];

    it('should transition to PENDING_APPROVAL when all safety prerequisites are acknowledged', () => {
      const acknowledgements: SafetyAcknowledgement[] = [
        {
          safetyPrerequisiteId: 'PREREQ-LOTO-01',
          acknowledgedByUserId: 'USER-TECH-01',
          acknowledgedAt: new Date(),
        },
        {
          safetyPrerequisiteId: 'PREREQ-PPE-01',
          acknowledgedByUserId: 'USER-TECH-01',
          acknowledgedAt: new Date(),
        },
        {
          safetyPrerequisiteId: 'PREREQ-VOLT-01',
          acknowledgedByUserId: 'USER-TECH-01',
          acknowledgedAt: new Date(),
        },
      ];

      const workOrder = new WorkOrder({
        id: 'WO-100',
        equipmentId: 'EQ-TURBINE-01',
        manualRevisionUsed: 'v2',
        diagnosticSteps: sampleStepsWithSafety,
        safetyAcknowledgements: acknowledgements,
      });

      expect(workOrder.canTransitionToApproval()).toBe(true);
      expect(workOrder.status).toBe('DRAFT');

      workOrder.attemptTransitionToApproval();
      expect(workOrder.status).toBe('PENDING_APPROVAL');
    });

    it('should prevent transition and throw UnacknowledgedSafetyPrerequisiteError listing missing IDs when one prerequisite is missing', () => {
      // Missing 'PREREQ-VOLT-01'
      const partialAcknowledgements: SafetyAcknowledgement[] = [
        {
          safetyPrerequisiteId: 'PREREQ-LOTO-01',
          acknowledgedByUserId: 'USER-TECH-01',
          acknowledgedAt: new Date(),
        },
        {
          safetyPrerequisiteId: 'PREREQ-PPE-01',
          acknowledgedByUserId: 'USER-TECH-01',
          acknowledgedAt: new Date(),
        },
      ];

      const workOrder = new WorkOrder({
        id: 'WO-101',
        equipmentId: 'EQ-TURBINE-01',
        manualRevisionUsed: 'v2',
        diagnosticSteps: sampleStepsWithSafety,
        safetyAcknowledgements: partialAcknowledgements,
      });

      expect(workOrder.canTransitionToApproval()).toBe(false);
      expect(workOrder.getMissingSafetyPrerequisites()).toEqual(['PREREQ-VOLT-01']);

      expect(() => workOrder.attemptTransitionToApproval()).toThrowError(
        UnacknowledgedSafetyPrerequisiteError
      );

      try {
        workOrder.attemptTransitionToApproval();
      } catch (err) {
        expect(err).toBeInstanceOf(UnacknowledgedSafetyPrerequisiteError);
        const domainErr = err as UnacknowledgedSafetyPrerequisiteError;
        expect(domainErr.missingPrerequisiteIds).toEqual(['PREREQ-VOLT-01']);
        expect(domainErr.message).toContain('PREREQ-VOLT-01');
      }

      // Status remains DRAFT
      expect(workOrder.status).toBe('DRAFT');
    });

    it('should transition successfully when no steps require safety check', () => {
      const benignSteps: DiagnosticStep[] = [
        {
          id: 'STEP-VISUAL-1',
          order: 1,
          instruction: 'Perform visual inspection of external gauge markings',
          requiresSafetyCheck: false,
          linkedSafetyPrerequisiteIds: [],
        },
      ];

      const workOrder = new WorkOrder({
        id: 'WO-102',
        equipmentId: 'EQ-PUMP-01',
        manualRevisionUsed: 'v1',
        diagnosticSteps: benignSteps,
        safetyAcknowledgements: [],
      });

      expect(workOrder.canTransitionToApproval()).toBe(true);
      workOrder.attemptTransitionToApproval();
      expect(workOrder.status).toBe('PENDING_APPROVAL');
    });

    it('should enforce encapsulation: attempting to mutate status directly is blocked at compile time', () => {
      const workOrder = new WorkOrder({
        id: 'WO-103',
        equipmentId: 'EQ-PUMP-01',
        manualRevisionUsed: 'v1',
        diagnosticSteps: sampleStepsWithSafety,
      });

      // Verification via TypeScript's type system & JS getter encapsulation:
      // Status property only exposes a getter and has no setter.
      expect(() => {
        // @ts-expect-error Cannot assign to 'status' because it is a read-only property.
        workOrder.status = 'PENDING_APPROVAL';
      }).toThrow(TypeError);

      // Constructor enforces initialStatus can only be DRAFT or PENDING_SAFETY_ACK
      new WorkOrder({
        id: 'WO-104',
        equipmentId: 'EQ-PUMP-01',
        manualRevisionUsed: 'v1',
        diagnosticSteps: sampleStepsWithSafety,
        // @ts-expect-error Type '"PENDING_APPROVAL"' is not assignable to type '"DRAFT" | "PENDING_SAFETY_ACK" | undefined'.
        initialStatus: 'PENDING_APPROVAL',
      });

      // At runtime, verify status is unchanged and still DRAFT
      expect(workOrder.status).toBe('DRAFT');
    });
  });
});
