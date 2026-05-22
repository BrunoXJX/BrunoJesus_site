import type { FastifyInstance } from 'fastify';
import { qualifyLead } from '../controllers/workflow.controller';

export async function workflowRoutes(app: FastifyInstance) {
  app.post('/workflows/lead-qualification', qualifyLead);
}
