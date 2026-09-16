export interface DiagnosticStep {
  id: string;
  order: number;
  instruction: string;
  requiresSafetyCheck: boolean;
  linkedSafetyPrerequisiteIds: string[];
}
