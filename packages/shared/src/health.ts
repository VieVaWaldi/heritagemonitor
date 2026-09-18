import {z} from 'zod'

// The contract for GET /v1/health, shared between apps/api (which produces
// this shape) and apps/web (which validates the response against it at the
// network boundary before trusting it).

export const healthCheckNameSchema = z.enum(['api', 'postgres', 'opensearch'])
export const healthCheckStatusSchema = z.enum(['ok', 'error'])

export const healthCheckResultSchema = z.object({
    name: healthCheckNameSchema,
    status: healthCheckStatusSchema,
    message: z.string(),
    checkedAt: z.coerce.date(),
})

export const healthCheckResponseSchema = z.object({
    status: healthCheckStatusSchema,
    checks: z.array(healthCheckResultSchema),
})

export type HealthCheckName = z.infer<typeof healthCheckNameSchema>
export type HealthCheckStatus = z.infer<typeof healthCheckStatusSchema>
export type HealthCheckResult = z.infer<typeof healthCheckResultSchema>
export type HealthCheckResponse = z.infer<typeof healthCheckResponseSchema>
