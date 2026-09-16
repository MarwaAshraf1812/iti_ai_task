export type EquipmentStatus = 'OPERATIONAL' | 'DEGRADED' | 'MAINTENANCE_REQUIRED' | 'OFFLINE';

export interface Equipment {
  id: string;
  serialNumber: string;
  model: string;
  location: string;
  status: EquipmentStatus;
  lastServiceDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TelemetryReading {
  id: string;
  equipmentId: string;
  timestamp: Date;
  metricName: string;
  metricValue: number;
  unit: string;
}
