import {apiGet} from '@/common/api/apiClient'
import {
    type RequestCountResponse,
    requestCountResponseSchema,
    type RequestTimeWindow,
} from '@heritagemonitor/shared'

export function getRequestCountByRoute(
    window: RequestTimeWindow,
    signal?: AbortSignal,
): Promise<RequestCountResponse> {
    const params = new URLSearchParams({window})
    return apiGet(`/v1/monitoring/request-count?${params}`, requestCountResponseSchema, {signal})
}
