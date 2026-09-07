import {apiGet} from '@/common/api/apiClient'
import {type HealthCheckResponse, healthCheckResponseSchema} from '@heritagemonitor/shared'

export function getHealthStatus(signal?: AbortSignal): Promise<HealthCheckResponse> {
    return apiGet('/v1/health', healthCheckResponseSchema, {signal})
}
