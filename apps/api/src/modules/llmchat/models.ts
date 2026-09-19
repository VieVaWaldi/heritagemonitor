// OpenRouter model catalog this app is allowed to use. Kept in code, not
// env — a model slug isn't a secret and doesn't vary by deployment
// environment, so it belongs in version-controlled, reviewable config
// rather than infra/.env. Verify slugs against
// https://openrouter.ai/api/v1/models before changing; OpenRouter's
// catalog churns and old slugs disappear.
export interface LlmModel {
    id: string
    label: string
    /** Total context window in tokens, straight from the same models listing
     * above (each provider defines "token" via its own tokenizer — see
     * contextBudget.ts for how that's reconciled across providers). */
    contextLength: number
}

export const LLM_MODELS: LlmModel[] = [
    {id: 'anthropic/claude-haiku-4.5', label: 'Claude Haiku 4.5', contextLength: 200_000},
    {id: 'openai/gpt-5.4-mini', label: 'GPT-5.4 Mini', contextLength: 400_000},
    {id: 'google/gemini-3.8-flash', label: 'Gemini 3.8 Flash', contextLength: 1_000_000},
]

export const DEFAULT_MODEL = LLM_MODELS[0]
export const DEFAULT_MODEL_ID = DEFAULT_MODEL.id
