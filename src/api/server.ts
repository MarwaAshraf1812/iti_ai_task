import Fastify, { FastifyInstance } from 'fastify';
import { Container } from '../infrastructure/container.js';
import { EquipmentController } from './http/controllers/equipment.controller.js';
import { registerEquipmentRoutes } from './http/routes/equipment.routes.js';
import { errorHandler } from './http/middlewares/error-handler.middleware.js';

export interface AppServer {
  app: FastifyInstance;
  equipmentController: EquipmentController;
  start(port?: number): Promise<string>;
}

export function createServer(container: Container): AppServer {
  const app = Fastify({
    logger: true,
  });

  const equipmentController = new EquipmentController(container.diagnoseEquipmentUseCase);

  // Register middlewares
  app.setErrorHandler(errorHandler);

  // Register health route
  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  // Register route stubs
  registerEquipmentRoutes(app, equipmentController);

  return {
    app,
    equipmentController,
    async start(port: number = 3000): Promise<string> {
      return app.listen({ port, host: '0.0.0.0' });
    },
  };
}
