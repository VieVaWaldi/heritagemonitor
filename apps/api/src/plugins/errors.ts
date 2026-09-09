import type {FastifyError, FastifyInstance} from 'fastify'

export class AppError extends Error {
    constructor(
        message: string,
        public readonly statusCode: number,
        public readonly isOperational = true,
    ) {
        super(message)
        this.name = 'AppError'
    }
}

export function registerErrorHandling(fastify: FastifyInstance) {
    fastify.setErrorHandler<FastifyError | AppError>((error, request, reply) => {
        if (error instanceof AppError) {
            request.log.warn({err: error}, error.message)
            return reply.status(error.statusCode).send({error: error.message})
        }

        request.log.error({err: error}, error.message)
        return reply.status(500).send({error: 'Internal server error'})
    })

    fastify.setNotFoundHandler((request, reply) => {
        reply.status(404).send({error: `Route ${request.method} ${request.url} not found`})
    })
}
