import type {HealthCheckResponse, HealthCheckResult} from '@heritagemonitor/shared'
import * as meilisearchRepository from './meilisearch.repository.js'
import * as opensearchRepository from './opensearch.repository.js'
import * as postgresRepository from './postgres.repository.js'

// Service layer: business/domain logic. Agnostic of transport (HTTP, queue, etc.)
// and of storage details — those live in the repositories. See RULES.md rule 3.

async function checkApi(): Promise<HealthCheckResult> {
    return {name: 'api', status: 'ok', message: 'api process is running', checkedAt: new Date()}
}

async function checkPostgres(): Promise<HealthCheckResult> {
    try {
        const latest = await postgresRepository.getLatestHealthCheck()
        const row = latest ?? (await postgresRepository.insertHealthCheck('postgres is running'))
        return {name: 'postgres', status: 'ok', message: row.message, checkedAt: new Date()}
    } catch (err) {
        const message = err instanceof Error ? err.message : 'unknown error'
        return {name: 'postgres', status: 'error', message, checkedAt: new Date()}
    }
}

async function checkOpenSearch(): Promise<HealthCheckResult> {
    try {
        const latest = await opensearchRepository.getLatestHealthCheck()
        const doc = latest ?? (await opensearchRepository.insertHealthCheck('open search is running'))
        return {name: 'opensearch', status: 'ok', message: doc.message, checkedAt: new Date()}
    } catch (err) {
        const message = err instanceof Error ? err.message : 'unknown error'
        return {name: 'opensearch', status: 'error', message, checkedAt: new Date()}
    }
}

async function checkMeilisearch(): Promise<HealthCheckResult> {
    try {
        const latest = await meilisearchRepository.getLatestHealthCheck()
        const doc = latest ?? (await meilisearchRepository.insertHealthCheck('meilisearch is running'))
        return {name: 'meilisearch', status: 'ok', message: doc.message, checkedAt: new Date()}
    } catch (err) {
        const message = err instanceof Error ? err.message : 'unknown error'
        return {name: 'meilisearch', status: 'error', message, checkedAt: new Date()}
    }
}

export async function checkHealth(): Promise<HealthCheckResponse> {
    const checks = await Promise.all([
        checkApi(),
        checkPostgres(),
        checkOpenSearch(),
        // Dev only — infra/docker-compose.prod.yml has no meilisearch
        // service and never sets MEILISEARCH_HOST, so prod skips this check
        // entirely instead of reporting a false error for a container that
        // was never meant to exist there. See infra/README.md.
        ...(process.env.MEILISEARCH_HOST ? [checkMeilisearch()] : []),
    ])
    const status = checks.every((check) => check.status === 'ok') ? 'ok' : 'error'

    return {status, checks}
}
