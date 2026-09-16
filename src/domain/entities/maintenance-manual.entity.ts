export interface ManualSection {
  id: string;
  sectionNumber: string;
  title: string;
  content: string;
  pageNumber: number;
  isSafetyPrerequisite: boolean;
}

export interface MaintenanceManual {
  id: string;
  equipmentModelId: string;
  revision: string; // e.g., "v1", "v2"
  sections: ManualSection[];
  effectiveDate: Date;
}
