import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { EquipmentController } from '../controllers/equipment.controller.js';

export function registerEquipmentRoutes(
  fastify: FastifyInstance,
  controller: EquipmentController,
  _opts?: FastifyPluginOptions
) {
  fastify.post('/api/v1/equipment/diagnose', async (request, reply) => {
    const response = await controller.diagnose({
      body: request.body,
      params: request.params as Record<string, string>,
      query: request.query as Record<string, string>,
    });

    return reply.status(response.statusCode).send(response.data);
  });
}
