import {apiGet} from '@/common/api/apiClient'
import {type BreadcrumbsResponse, breadcrumbsResponseSchema} from '@heritagemonitor/shared'

export function getBreadcrumbs(signal?: AbortSignal): Promise<BreadcrumbsResponse> {
    return apiGet('/v1/breadcrumbs', breadcrumbsResponseSchema, {signal})
}
