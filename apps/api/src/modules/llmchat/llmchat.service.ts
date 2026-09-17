import {randomUUID} from 'node:crypto'
import type {LlmChatRequest} from '@heritagemonitor/shared'
import {DEFAULT_MODEL_ID} from './models.js'
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

const SYSTEM_PROMPT =
    'You are the HeritageMonitor research assistant. Answer clearly and concisely, and say when you are not sure.'

function buildMessages(request: LlmChatRequest): OpenRouterMessage[] {
    const systemParts = [SYSTEM_PROMPT]
    if (request.context?.length) {
        systemParts.push('Context the user currently has open:', ...request.context)
    }

    return [
        {role: 'system', content: systemParts.join('\n\n')},
        ...request.messages.map((message) => ({role: message.role, content: message.content})),
    ]
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
