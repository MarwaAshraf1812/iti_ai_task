export interface SafetyPrerequisite {
  id: string;
  description: string;
  sourceManualSectionId: string;
  mustBeAcknowledgedBeforeStepIds: string[];
}

export interface SafetyAcknowledgement {
  safetyPrerequisiteId: string;
  acknowledgedByUserId: string;
  acknowledgedAt: Date;
}
