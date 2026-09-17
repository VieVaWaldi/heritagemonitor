// Repository-equivalent layer: the only file in this module that knows
// OpenRouter's wire format (endpoint, auth, SSE framing). See RULES.md rule 3
// (layer separation) — the service maps this into our own protocol so
// nothing above this file needs to know it's OpenRouter at all.

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

export interface OpenRouterMessage {
    role: 'system' | 'user' | 'assistant'
    content: string
}

export interface OpenRouterChunk {
    delta: string | null
    finishReason: string | null
}

export async function* streamChatCompletion(
    model: string,
    messages: OpenRouterMessage[],
    signal?: AbortSignal,
): AsyncGenerator<OpenRouterChunk> {
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) throw new Error('OPENROUTER_API_KEY is not set')

    const response = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({model, messages, stream: true}),
        signal,
    })

    if (!response.ok || !response.body) {
        const body = await response.text().catch(() => '')
        throw new Error(`OpenRouter request failed with status ${response.status}: ${body}`)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

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

                // Keep-alive comments (per SSE spec) and blank lines carry no data.
                if (!line || line.startsWith(':')) continue
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
