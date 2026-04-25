import type { FastifyReply, FastifyRequest, RouteHandlerMethod } from "fastify";

export function asyncHandler<TRequest extends FastifyRequest = FastifyRequest>(
  handler: (request: TRequest, reply: FastifyReply) => Promise<unknown>
): RouteHandlerMethod {
  return async (request, reply) => handler(request as TRequest, reply);
}
