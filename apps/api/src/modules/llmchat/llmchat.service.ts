import {randomUUID} from 'node:crypto'
import {readFileSync} from 'node:fs'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'
import type {ChatSource, LlmChatRequest} from '@heritagemonitor/shared'
import {estimateTokens, trimMessagesToBudget} from './contextBudget.js'
import {DEFAULT_MODEL, DEFAULT_MODEL_ID} from './models.js'
import {streamChatCompletion, type OpenRouterMessage} from './openrouter.client.js'

// Service layer: business/domain logic, agnostic of transport. See RULES.md
// rule 3. The events yielded here follow the Vercel AI SDK's UI Message
// Stream chunk shapes (https://ai-sdk.dev/docs/ai-sdk-ui/stream-protocol) —
// not because we use that SDK, but because @mui/x-chat's createAiSdkAdapter
// decodes exactly this shape, saving apps/web from needing any bespoke
// stream-parsing code of its own.
export type LlmChatEvent =
    | {type: 'start'}
    | {type: 'text-start'; id: string}
    | {type: 'text-delta'; id: string; delta: string}
    | {type: 'text-end'; id: string}
    | {type: 'finish'; finishReason?: string}
    | {type: 'error'; errorText: string}
    // Not part of the AI SDK's stream vocabulary above — apps/web's
    // adapter.ts intercepts this one itself (see its watchChatEvents)
    // rather than handing it to createAiSdkAdapter, since it's a transient
    // "something is happening" status (e.g. the web-fetch tool running),
    // not a real tool call with input/output to model as a message part.
    | {type: 'event'; message: string}

// Read once at startup, not per-request — the prompt is static for the
// process's lifetime. Resolved relative to this file (not cwd) so it works
// both under `tsx` (running straight from src/) and the built prod image
// (running from dist/, where the build script copies the .md alongside the
// compiled .js — see package.json's postbuild).
const SYSTEM_PROMPT = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'SystemPrompt.md'), 'utf-8')

// Hostnames of the request's approved sourceUrls — the only allowlist
// openrouter:web_fetch actually supports (see openrouter.client.ts). Invalid
// URLs can't reach here (llmChatRequestSchema validates each one at the
// route boundary), so URL parsing here can't throw.
function allowedDomainsFor(sourceUrls: ChatSource[]): string[] {
    return [...new Set(sourceUrls.map((source) => new URL(source.url).hostname))]
}

function buildMessages(request: LlmChatRequest, sourceUrls: ChatSource[]): OpenRouterMessage[] {
    const systemParts = [SYSTEM_PROMPT]
    if (request.context?.length) {
        systemParts.push('Context the user currently has open:', ...request.context)
    }
    if (sourceUrls.length) {
        systemParts.push(
            'Approved sources you may fetch with your web-fetch tool (never fetch any URL not listed here):',
            ...sourceUrls.map((source) => `- ${source.label}: ${source.url}`),
        )
    }
    const systemContent = systemParts.join('\n\n')

    const history = request.messages.map((message) => ({role: message.role, content: message.content}))
    // Drops the oldest turns once system + context + history would no longer
    // fit the model's window — see contextBudget.ts.
    const trimmedHistory = trimMessagesToBudget(history, DEFAULT_MODEL.contextLength, estimateTokens(systemContent))

    return [{role: 'system', content: systemContent}, ...trimmedHistory]
}

export async function* streamLlmChat(
    request: LlmChatRequest,
    signal?: AbortSignal,
): AsyncGenerator<LlmChatEvent> {
    const sourceUrls = request.sourceUrls ?? []
    const messages = buildMessages(request, sourceUrls)
    const textPartId = randomUUID()

    try {
        yield {type: 'start'}
        yield {type: 'text-start', id: textPartId}

        let finishReason: string | undefined
        for await (const chunk of streamChatCompletion(DEFAULT_MODEL_ID, messages, allowedDomainsFor(sourceUrls), signal)) {
            if (chunk.event) yield {type: 'event', message: chunk.event}
            if (chunk.delta) yield {type: 'text-delta', id: textPartId, delta: chunk.delta}
            if (chunk.finishReason) finishReason = chunk.finishReason
        }

        yield {type: 'text-end', id: textPartId}
        yield {type: 'finish', finishReason}
    } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        const message = err instanceof Error ? err.message : 'Unknown error'
        yield {type: 'error', errorText: message}
    }
}
