import { DiagnosticStep } from './diagnostic-step.entity.js';
import { SafetyAcknowledgement } from './safety-prerequisite.entity.js';
import { UnacknowledgedSafetyPrerequisiteError } from '../exceptions/domain.error.js';

export type WorkOrderStatus =
  | 'DRAFT'
  | 'PENDING_SAFETY_ACK'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'EDITED_APPROVED'
  | 'DISPATCHED';

export interface CreateWorkOrderParams {
  id: string;
  equipmentId: string;
  manualRevisionUsed: string;
  diagnosticSteps: DiagnosticStep[];
  safetyAcknowledgements?: SafetyAcknowledgement[];
  initialStatus?: 'DRAFT' | 'PENDING_SAFETY_ACK';
  createdAt?: Date;
}

export class WorkOrder {
  public readonly id: string;
  public readonly equipmentId: string;
  public readonly manualRevisionUsed: string;
  public readonly diagnosticSteps: DiagnosticStep[];
  public readonly safetyAcknowledgements: SafetyAcknowledgement[];
  public readonly createdAt: Date;

  // Private field ensures status transitions are strictly guarded by domain rules
  private _status: WorkOrderStatus;

  constructor(params: CreateWorkOrderParams) {
    this.id = params.id;
    this.equipmentId = params.equipmentId;
    this.manualRevisionUsed = params.manualRevisionUsed;
    this.diagnosticSteps = [...params.diagnosticSteps];
    this.safetyAcknowledgements = params.safetyAcknowledgements
      ? [...params.safetyAcknowledgements]
      : [];
    this._status = params.initialStatus ?? 'DRAFT';
    this.createdAt = params.createdAt ?? new Date();
  }

  // Controlled getter - no public setter exists to set status directly
  public get status(): WorkOrderStatus {
    return this._status;
  }

  /**
   * Helper to append a safety acknowledgement to the work order.
   */
  public addSafetyAcknowledgement(acknowledgement: SafetyAcknowledgement): void {
    this.safetyAcknowledgements.push(acknowledgement);
  }

  /**
   * Returns a list of required safety prerequisite IDs across all steps that
   * have not yet been acknowledged.
   */
  public getMissingSafetyPrerequisites(): string[] {
    const acknowledgedIds = new Set(
      this.safetyAcknowledgements.map((ack) => ack.safetyPrerequisiteId)
    );

    const missingIds = new Set<string>();

    for (const step of this.diagnosticSteps) {
      if (step.requiresSafetyCheck) {
        for (const prereqId of step.linkedSafetyPrerequisiteIds) {
          if (!acknowledgedIds.has(prereqId)) {
            missingIds.add(prereqId);
          }
        }
      }
    }

    return Array.from(missingIds);
  }

  /**
   * Returns true only when every required safety prerequisite across every
   * diagnostic step marked with requiresSafetyCheck has a corresponding acknowledgement.
   */
  public canTransitionToApproval(): boolean {
    return this.getMissingSafetyPrerequisites().length === 0;
  }

  /**
   * The ONLY legitimate domain path to transition a WorkOrder to 'PENDING_APPROVAL'.
   * Structurally enforces that unacknowledged safety prerequisites throw a domain error.
   */
  public attemptTransitionToApproval(): void {
    const missing = this.getMissingSafetyPrerequisites();
    if (missing.length > 0) {
      throw new UnacknowledgedSafetyPrerequisiteError(missing);
    }

    this._status = 'PENDING_APPROVAL';
  }
}
