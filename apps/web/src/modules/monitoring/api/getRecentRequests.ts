import {apiGet} from '@/common/api/apiClient'
import {type RecentRequestsResponse, recentRequestsResponseSchema} from '@heritagemonitor/shared'

export function getRecentRequests(signal?: AbortSignal): Promise<RecentRequestsResponse> {
    return apiGet('/v1/monitoring/recent-requests', recentRequestsResponseSchema, {signal})
}
