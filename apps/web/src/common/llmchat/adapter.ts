import {createAiSdkAdapter} from '@mui/x-chat'
import {ApiError} from '@/common/api/apiClient'
import {CORPUSES, USE_CASES, type CorpusKey, type UseCase} from '@/common/catalog'
import type {PageContext} from './pageContext'

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
// presentation-only fields (icon, color) an LLM has no use for. Includes
// each UseCase/SubUseCase's real `action.route` so Lucy has ground-truth
// paths to link to instead of guessing at heritagemonitor.org URLs.
function describeUseCase(useCase: UseCase): string {
    const lines = [`${useCase.name} — ${useCase.title}`, useCase.description]
    if (useCase.action?.route) lines.push(`Route: ${useCase.action.route}`)
    if (useCase.examples?.length) lines.push(`Example queries: ${useCase.examples.join(', ')}`)
    if (useCase.subUseCases?.length) {
        lines.push(
            `Sub-options: ${useCase.subUseCases
                .map(
                    (sub) =>
                        `${sub.name}${sub.action.route ? ` (route: ${sub.action.route})` : ''}`,
                )
                .join(', ')}`,
        )
    }
    if (useCase.tip) lines.push(`Tip: ${useCase.tip}`)
    return lines.join('\n')
}

const USE_CASES_CONTEXT = USE_CASES.map(describeUseCase)

// Static list of both corpora Lucy can mention — the selected one is added
// fresh per-message alongside this (see describeSelectedCorpus below), same
// "static catalog + live selection" split as USE_CASES_CONTEXT/getPageContext.
const CORPUSES_CONTEXT = `Available corpora: ${CORPUSES.map((corpus) => `${corpus.fullName} (${corpus.key})`).join(', ')}`

function describeSelectedCorpus(corpusKey: CorpusKey): string {
    const corpus = CORPUSES.find((c) => c.key === corpusKey)
    return `Currently selected corpus: ${corpus?.fullName ?? corpusKey}`
}

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

// /v1/llmchat/stream emits one chunk type outside the AI SDK vocabulary
// createAiSdkAdapter understands: `{type: 'event', message}` (see
// llmchat.service.ts) — a transient "something is happening server-side"
// status (currently: the web-fetch tool running). Deliberately not routed
// through @mui/x-chat's tool-invocation data model, which is built for a
// real tool call with input/output to render as a message part, not a
// one-line opaque status string with no such detail. Watching for it here
// (byte-for-byte passthrough otherwise) keeps it a plain piece of React
// state LlmChatBox renders inline instead. Cleared on the first real token,
// or on finish/error so it never outlives the reply it was about.
function watchChatEvents(body: ReadableStream<Uint8Array>, onEvent: (message: string | null) => void): ReadableStream<Uint8Array> {
    const decoder = new TextDecoder()
    let buffer = ''

    return body.pipeThrough(
        new TransformStream<Uint8Array, Uint8Array>({
            transform(chunk, controller) {
                controller.enqueue(chunk)

                buffer += decoder.decode(chunk, {stream: true})
                let newlineIndex = buffer.indexOf('\n')
                while (newlineIndex !== -1) {
                    const line = buffer.slice(0, newlineIndex).trim()
                    buffer = buffer.slice(newlineIndex + 1)
                    newlineIndex = buffer.indexOf('\n')

                    if (!line.startsWith('data: ')) continue
                    const parsed = JSON.parse(line.slice('data: '.length))
                    if (parsed.type === 'event') onEvent(parsed.message)
                    else if (parsed.type === 'text-delta' || parsed.type === 'finish' || parsed.type === 'error') {
                        onEvent(null)
                    }
                }
            },
        }),
    )
}

// `getPageContext` reads whatever the current page's results panel (if any)
// has published via usePageChatContextPublisher (see PageChatContext.tsx) — a
// stable accessor, not the value itself, since this factory only runs once
// per chat session (see LlmChatBox's useMemo) but needs a fresh read on
// every message sent. `getSelectedCorpus` is the same kind of stable
// accessor for CorpusContext's current selection. `onEvent` drives
// LlmChatBox's inline status indicator, see watchChatEvents above.
export function createLlmChatAdapter(
    getPageContext: (signal: AbortSignal) => Promise<PageContext>,
    getSelectedCorpus: () => CorpusKey,
    onEvent: (message: string | null) => void,
) {
    return createAiSdkAdapter({
        stream: async ({messages, signal}) => {
            const headers = new Headers({'Content-Type': 'application/json'})
            headers.set('X-Request-Id', crypto.randomUUID())

            // Read ONCE per send, and awaited: the page's lazy parts (the
            // selected entity's related lists) are fetched now, not while the
            // user browses. See resolvePageContext.
            const pageContext = await getPageContext(signal)

            const response = await fetch(`${API_BASE_URL}/v1/llmchat/stream`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    // `messages` already includes the just-sent user message as its
                    // last entry (the runtime appends it to the store before calling
                    // sendMessage) — 'system' is filtered out since api owns the
                    // system prompt, never the client.
                    messages: messages
                        .filter(
                            (message) => message.role === 'user' || message.role === 'assistant',
                        )
                        .map((message) => ({role: message.role, content: getMessageText(message)})),
                    // Read fresh on every send (not memoized like
                    // USE_CASES_CONTEXT above), so this is always the page
                    // the user is actually on right now, params included.
                    context: [
                        ...USE_CASES_CONTEXT,
                        CORPUSES_CONTEXT,
                        describeSelectedCorpus(getSelectedCorpus()),
                        `Current page URL: ${window.location.href}`,
                        // Only populated when the current page's results
                        // panel has published something — empty everywhere
                        // else. See PageChatContext.tsx.
                        ...pageContext.lines,
                    ],
                    // Approved fetch targets that came from the same
                    // published page context — never model-invented, see
                    // llmchat.ts's sourceUrls doc comment.
                    sourceUrls: pageContext.sources,
                }),
                signal,
            })

            if (!response.ok || !response.body) {
                throw new ApiError(
                    `POST /v1/llmchat/stream failed with status ${response.status}`,
                    response.status,
                )
            }

            return watchChatEvents(response.body, onEvent)
        },
    })
}
