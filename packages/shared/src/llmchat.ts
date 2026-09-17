import {z} from 'zod'

// The contract for POST /v1/llmchat/stream.

export const chatRoleSchema = z.enum(['user', 'assistant'])

export const chatMessageSchema = z.object({
    role: chatRoleSchema,
    content: z.string().min(1),
})

export const llmChatRequestSchema = z.object({
    messages: z.array(chatMessageSchema).min(1),
    // Extra context (e.g. the projects a /search user currently has open) to
    // fold into the system prompt. Unused until /search integrates this —
    // present now so that integration isn't a breaking schema change.
    context: z.array(z.string()).optional(),
})

export type ChatRole = z.infer<typeof chatRoleSchema>
export type ChatMessage = z.infer<typeof chatMessageSchema>
export type LlmChatRequest = z.infer<typeof llmChatRequestSchema>
