import {createAiSdkAdapter} from '@mui/x-chat'
import {ApiError} from '@/common/api/apiClient'
import {USE_CASES, type UseCase} from '@/common/catalog'

// The one file in this module that knows @mui/x-chat's adapter shape (see
// apps/web/RULES.md rule 4, wrap external components). createAiSdkAdapter
// decodes the Vercel AI SDK "UI Message Stream" wire format — apps/api's
// /v1/llmchat/stream emits exactly that shape (see llmchat.service.ts on the
// api side) purely so this adapter can stay this thin: no bespoke
// SSE-parsing code needed on either end.

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL

// Text summary of what the platform's UseCases actually offer, so Lucy can
// point users at the right one. Built once from the same USE_CASES data the
// landing page renders (not duplicated content), stripped of the
// presentation-only fields (icon, color) an LLM has no use for.
function describeUseCase(useCase: UseCase): string {
    const lines = [`${useCase.name} — ${useCase.title}`, useCase.description]
    if (useCase.examples?.length) lines.push(`Example queries: ${useCase.examples.join(', ')}`)
    if (useCase.subUseCases?.length) {
        lines.push(`Sub-options: ${useCase.subUseCases.map((sub) => sub.name).join(', ')}`)
    }
    if (useCase.tip) lines.push(`Tip: ${useCase.tip}`)
    return lines.join('\n')
}

const USE_CASES_CONTEXT = USE_CASES.map(describeUseCase)

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

// `getPageContext` reads whatever the current page's results panel (if any)
// has published via usePageChatContextPublisher (see PageChatContext.tsx) — a
// stable accessor, not the value itself, since this factory only runs once
// per chat session (see LlmChatBox's useMemo) but needs a fresh read on
// every message sent.
export function createLlmChatAdapter(getPageContext: () => string[]) {
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
                    // Read fresh on every send (not memoized like
                    // USE_CASES_CONTEXT above), so this is always the page
                    // the user is actually on right now, params included.
                    context: [
                        ...USE_CASES_CONTEXT,
                        `Current page URL: ${window.location.href}`,
                        // Only populated when the current page's results
                        // panel has published something — empty everywhere
                        // else. See PageChatContext.tsx.
                        ...getPageContext(),
                    ],
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
