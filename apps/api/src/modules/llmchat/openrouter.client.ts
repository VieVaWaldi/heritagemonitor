// Repository-equivalent layer: the only file in this module that knows
// OpenRouter's wire format (endpoint, auth, SSE framing). See RULES.md rule 3
// (layer separation) — the service maps this into our own protocol so
// nothing above this file needs to know it's OpenRouter at all.

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

// Caps for the openrouter:web_fetch server tool (docs:
// https://openrouter.ai/docs/guides/features/server-tools/web-fetch) — both
// unbounded by default on OpenRouter's side, so left unset they'd let Lucy
// fetch as many URLs as she wants, each returned in full. max_uses caps
// fetches for the whole request (matches pageContext.ts's own MAX_SOURCES
// cap on how many approved URLs are ever offered to her); max_content_tokens
// keeps one fetched page/PDF from itself blowing contextBudget.ts's window.
const WEB_FETCH_MAX_USES = 20
const WEB_FETCH_MAX_CONTENT_TOKENS = 10_000

export interface OpenRouterMessage {
    role: 'system' | 'user' | 'assistant'
    content: string
}

export interface OpenRouterChunk {
    delta: string | null
    finishReason: string | null
    // Set once, the first time OpenRouter sends an SSE keep-alive comment
    // before any token arrives — confirmed empirically that a plain no-tool
    // request never produces one, so seeing one only when web_fetch was
    // actually offered reliably means OpenRouter is waiting on the fetch,
    // not just normal generation latency. OpenRouter exposes no proper
    // "tool is running" event for this managed server-side tool, so this
    // comment is the only signal available — see llmchat.service.ts.
    event?: string
}

export async function* streamChatCompletion(
    model: string,
    messages: OpenRouterMessage[],
    // Hostnames pulled from the request's approved sourceUrls (see
    // llmchat.service.ts) — web_fetch only supports host-level allowlisting,
    // not exact-URL, so SystemPrompt.md's tool-access rules are what
    // actually restrict Lucy to the specific approved URLs within an
    // allowed host. Empty means no web_fetch tool is offered at all (no
    // approved sources published for the current page).
    allowedDomains: string[],
    signal?: AbortSignal,
): AsyncGenerator<OpenRouterChunk> {
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) throw new Error('OPENROUTER_API_KEY is not set')

    const tools = allowedDomains.length
        ? [
              {
                  type: 'openrouter:web_fetch',
                  parameters: {
                      max_uses: WEB_FETCH_MAX_USES,
                      max_content_tokens: WEB_FETCH_MAX_CONTENT_TOKENS,
                      allowed_domains: allowedDomains,
                  },
              },
          ]
        : undefined

    const response = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({model, messages, stream: true, ...(tools && {tools})}),
        signal,
    })

    if (!response.ok || !response.body) {
        const body = await response.text().catch(() => '')
        throw new Error(`OpenRouter request failed with status ${response.status}: ${body}`)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let emittedFetchingEvent = false

    try {
        while (true) {
            const {done, value} = await reader.read()
            if (done) return
            buffer += decoder.decode(value, {stream: true})

            let newlineIndex = buffer.indexOf('\n')
            while (newlineIndex !== -1) {
                const line = buffer.slice(0, newlineIndex).trim()
                buffer = buffer.slice(newlineIndex + 1)
                newlineIndex = buffer.indexOf('\n')

                // Keep-alive comments (per SSE spec) and blank lines carry no
                // data of their own, but a comment here — only when the
                // web_fetch tool was actually offered (`tools` set above) —
                // is itself the signal (see OpenRouterChunk's `event` doc).
                if (!line) continue
                if (line.startsWith(':')) {
                    if (tools && !emittedFetchingEvent) {
                        emittedFetchingEvent = true
                        yield {delta: null, finishReason: null, event: 'Lucy is fetching a page'}
                    }
                    continue
                }
                if (!line.startsWith('data: ')) continue

                const data = line.slice('data: '.length)
                if (data === '[DONE]') return

                const parsed = JSON.parse(data)
                const choice = parsed.choices?.[0]
                yield {
                    delta: choice?.delta?.content ?? null,
                    finishReason: choice?.finish_reason ?? null,
                }
            }
        }
    } finally {
        reader.releaseLock()
    }
}
