import {createAiSdkAdapter} from '@mui/x-chat'
import {ApiError} from '@/common/api/apiClient'

// The one file in this module that knows @mui/x-chat's adapter shape (see
// apps/web/RULES.md rule 4, wrap external components). createAiSdkAdapter
// decodes the Vercel AI SDK "UI Message Stream" wire format — apps/api's
// /v1/llmchat/stream emits exactly that shape (see llmchat.service.ts on the
// api side) purely so this adapter can stay this thin: no bespoke
// SSE-parsing code needed on either end.

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL

interface ChatMessagePart {
    type: string
    text?: string
}

interface ChatMessageLike {
    role: string
    parts: ChatMessagePart[]
}

function getMessageText(message: ChatMessageLike): string {
    return message.parts.map((part) => (part.type === 'text' ? (part.text ?? '') : '')).join('')
}

export function createLlmChatAdapter() {
    return createAiSdkAdapter({
        stream: async ({messages, signal}) => {
            const headers = new Headers({'Content-Type': 'application/json'})
            headers.set('X-Request-Id', crypto.randomUUID())

            const response = await fetch(`${API_BASE_URL}/v1/llmchat/stream`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    // `messages` already includes the just-sent user message as its
                    // last entry (the runtime appends it to the store before calling
                    // sendMessage) — 'system' is filtered out since api owns the
                    // system prompt, never the client.
                    messages: messages
                        .filter((message) => message.role === 'user' || message.role === 'assistant')
                        .map((message) => ({role: message.role, content: getMessageText(message)})),
                }),
                signal,
            })

            if (!response.ok || !response.body) {
                throw new ApiError(`POST /v1/llmchat/stream failed with status ${response.status}`, response.status)
            }

            return response.body
        },
    })
}
