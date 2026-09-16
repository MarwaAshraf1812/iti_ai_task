import { Equipment } from '../../domain/entities/equipment.entity.js';
import { IEquipmentRepository } from '../../application/ports/equipment-repository.port.js';

export class PostgresEquipmentRepository implements IEquipmentRepository {
  constructor(private readonly connectionString?: string) {}

  async findById(_id: string): Promise<Equipment | null> {
    // Stub implementation - will be wired to Postgres/pgvector in future tasks
    return null;
  }

  async findBySerialNumber(_serialNumber: string): Promise<Equipment | null> {
    // Stub implementation
    return null;
  }

  async save(_equipment: Equipment): Promise<void> {
    // Stub implementation
  }
}
