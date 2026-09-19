import type {OpenRouterMessage} from './openrouter.client.js'

// Keeps a request within a model's context window by dropping the oldest
// messages once the estimate gets too big. No single JS tokenizer covers
// Anthropic/OpenAI/Google's three different tokenizers at once (the catalog
// in models.ts spans all three), so this uses the standard ~4-chars-per-token
// approximation instead of an exact count — deliberately, not as a shortcut:
// an exact tokenizer would only be exact for one provider and wrong for the
// other two.
const CHARS_PER_TOKEN = 4

// Reserved for the model's own reply — never counted as available budget for
// the request itself.
const COMPLETION_TOKEN_RESERVE = 1_000

export function estimateTokens(text: string): number {
    return Math.ceil(text.length / CHARS_PER_TOKEN)
}

// `reservedTokens` covers everything that isn't `messages` — the system
// prompt plus any extra context lines already folded into it (see
// buildMessages in llmchat.service.ts) — so the caller passes in the exact
// token cost of that fixed part of the request rather than this function
// guessing at it.
export function trimMessagesToBudget(
    messages: OpenRouterMessage[],
    contextLength: number,
    reservedTokens: number,
): OpenRouterMessage[] {
    const budget = contextLength - reservedTokens - COMPLETION_TOKEN_RESERVE

    const kept: OpenRouterMessage[] = []
    let used = 0
    // Walk newest-first so the most recent turns are always kept, then
    // re-reverse — the oldest messages are the ones dropped when the
    // conversation has grown past what fits.
    for (let i = messages.length - 1; i >= 0; i--) {
        const tokens = estimateTokens(messages[i].content)
        if (used + tokens > budget && kept.length > 0) break
        kept.push(messages[i])
        used += tokens
    }

    return kept.reverse()
}
