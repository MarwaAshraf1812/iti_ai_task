import { Equipment } from '../../domain/entities/equipment.entity.js';

export interface IEquipmentRepository {
  findById(id: string): Promise<Equipment | null>;
  findBySerialNumber(serialNumber: string): Promise<Equipment | null>;
  save(equipment: Equipment): Promise<void>;
}
