import {apiGet} from '@/common/api/apiClient'
import {type MonitoredRoutesResponse, monitoredRoutesResponseSchema} from '@heritagemonitor/shared'

export function getMonitoredRoutes(signal?: AbortSignal): Promise<MonitoredRoutesResponse> {
    return apiGet('/v1/monitoring/routes', monitoredRoutesResponseSchema, {signal})
}
