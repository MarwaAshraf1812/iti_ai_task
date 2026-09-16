import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { DomainError } from '../../../domain/exceptions/domain.error.js';

export function errorHandler(error: FastifyError, _request: FastifyRequest, reply: FastifyReply) {
  if (error instanceof DomainError) {
    reply.status(400).send({
      statusCode: 400,
      error: error.name,
      message: error.message,
    });
    return;
  }

  reply.status(error.statusCode || 500).send({
    statusCode: error.statusCode || 500,
    error: 'InternalServerError',
    message: error.message || 'An unexpected error occurred',
  });
}
