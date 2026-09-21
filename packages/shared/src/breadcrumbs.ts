import {z} from 'zod'

// Contract for /v1/breadcrumbs: where visitors have been, for the team's own
// /health/breadcrumbs view.
//
// Everything here is deliberately small and shapeless: a path, a query string
// and a random per-session id. No IP, no user agent, no account — see the
// table in packages/db for why that is a property of the schema rather than a
// promise.

/** Longest path we will store. Ours are short; anything longer is not one of ours. */
export const BREADCRUMB_MAX_PATH = 512
/** Longest query string. A topic selection with 20 ids is the realistic worst case. */
export const BREADCRUMB_MAX_QUERY = 2_048
/** A session id is a fixed-length random token from the browser. */
export const BREADCRUMB_SESSION_ID_LENGTH = 16
/** How many the health page shows. */
export const BREADCRUMB_PAGE_SIZE = 100
/** How many the browser keeps for Lucy's context. */
export const BREADCRUMB_TRAIL_LENGTH = 10

/**
 * Strict by design: this endpoint is unauthenticated, so the shapes it accepts
 * are the only thing standing between it and anyone who wants to write rows.
 *
 * `path` must be an app-relative path — a leading slash and no scheme, host or
 * protocol-relative `//`, so nothing off this site can be recorded through it.
 */
export const breadcrumbSchema = z.object({
    sessionId: z
        .string()
        .length(BREADCRUMB_SESSION_ID_LENGTH)
        .regex(/^[a-z0-9]+$/, 'session id must be lowercase alphanumeric'),
    path: z
        .string()
        .min(1)
        .max(BREADCRUMB_MAX_PATH)
        .regex(/^\/(?!\/)[^\s?#]*$/, 'path must be app-relative, with no host or fragment'),
    query: z.string().max(BREADCRUMB_MAX_QUERY).default(''),
})
export type Breadcrumb = z.infer<typeof breadcrumbSchema>

export const breadcrumbRowSchema = z.object({
    id: z.number(),
    sessionId: z.string(),
    path: z.string(),
    query: z.string(),
    createdAt: z.string(),
})
export type BreadcrumbRow = z.infer<typeof breadcrumbRowSchema>

export const breadcrumbsResponseSchema = z.object({
    rows: z.array(breadcrumbRowSchema),
    retentionDays: z.number(),
})
export type BreadcrumbsResponse = z.infer<typeof breadcrumbsResponseSchema>
