import {apiGet} from '@/common/api/apiClient'
import {
    type RequestTimeSeriesResponse,
    requestTimeSeriesResponseSchema,
    type RequestTimeWindow,
} from '@heritagemonitor/shared'

// route: null means "all tracked routes combined" — matches the api's own
// contract (see packages/shared/src/monitoring.ts)
export function getRequestTimeSeries(
    route: string | null,
    window: RequestTimeWindow,
    signal?: AbortSignal,
): Promise<RequestTimeSeriesResponse> {
    const params = new URLSearchParams({window})
    if (route) params.set('route', route)

    return apiGet(`/v1/monitoring/request-time?${params}`, requestTimeSeriesResponseSchema, {
        signal,
    })
}
