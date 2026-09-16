import { describe, it, expect } from 'vitest';
import { Container } from '../../src/infrastructure/container.js';
import { createServer } from '../../src/api/server.js';
import { EquipmentController } from '../../src/api/http/controllers/equipment.controller.js';

describe('API Layer', () => {
  it('should return 400 when required fields are missing in controller', async () => {
    const container = Container.create();
    const controller = new EquipmentController(container.diagnoseEquipmentUseCase);

    const response = await controller.diagnose({
      body: { equipmentId: '' },
      params: {},
      query: {},
    });

    expect(response.statusCode).toBe(400);
  });

  it('should respond to /health endpoint with 200 OK via Fastify', async () => {
    const container = Container.create();
    const server = createServer(container);

    const res = await server.app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(res.statusCode).toBe(200);
    const payload = JSON.parse(res.payload);
    expect(payload.status).toBe('ok');
  });

  it('should route /api/v1/equipment/diagnose through Fastify', async () => {
    const container = Container.create();
    const server = createServer(container);

    const res = await server.app.inject({
      method: 'POST',
      url: '/api/v1/equipment/diagnose',
      payload: {
        equipmentId: 'TURBINE-001',
        symptoms: 'Excessive vibration in rotor stage 2',
      },
    });

    expect(res.statusCode).toBe(200);
    const payload = JSON.parse(res.payload);
    expect(payload.equipmentId).toBe('TURBINE-001');
  });
});
