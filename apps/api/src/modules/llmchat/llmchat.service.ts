import {randomUUID} from 'node:crypto'
import {readFileSync} from 'node:fs'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'
import type {LlmChatRequest} from '@heritagemonitor/shared'
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

// Read once at startup, not per-request — the prompt is static for the
// process's lifetime. Resolved relative to this file (not cwd) so it works
// both under `tsx` (running straight from src/) and the built prod image
// (running from dist/, where the build script copies the .md alongside the
// compiled .js — see package.json's postbuild).
const SYSTEM_PROMPT = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'SystemPrompt.md'), 'utf-8')

function buildMessages(request: LlmChatRequest): OpenRouterMessage[] {
    const systemParts = [SYSTEM_PROMPT]
    if (request.context?.length) {
        systemParts.push('Context the user currently has open:', ...request.context)
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
    const messages = buildMessages(request)
    const textPartId = randomUUID()

    try {
        yield {type: 'start'}
        yield {type: 'text-start', id: textPartId}

        let finishReason: string | undefined
        for await (const chunk of streamChatCompletion(DEFAULT_MODEL_ID, messages, signal)) {
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
