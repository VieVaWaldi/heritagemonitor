import {z} from 'zod'

// The contract for POST /v1/llmchat/stream.

export const chatRoleSchema = z.enum(['user', 'assistant'])

export const chatMessageSchema = z.object({
    role: chatRoleSchema,
    content: z.string().min(1),
})

export const chatSourceSchema = z.object({
    label: z.string(),
    url: z.string().url(),
})

export const llmChatRequestSchema = z.object({
    messages: z.array(chatMessageSchema).min(1),
    // Extra context (e.g. the projects a /search user currently has open) to
    // fold into the system prompt.
    context: z.array(z.string()).optional(),
    // URLs drawn from the data the user is actually looking at (e.g. a
    // work's PDF link) that Lucy is allowed to fetch with her web_fetch
    // tool. Never model-invented — only what a results panel explicitly
    // published, see apps/web/common/llmchat/pageContext.ts.
    sourceUrls: z.array(chatSourceSchema).optional(),
})

export type ChatRole = z.infer<typeof chatRoleSchema>
export type ChatMessage = z.infer<typeof chatMessageSchema>
export type ChatSource = z.infer<typeof chatSourceSchema>
export type LlmChatRequest = z.infer<typeof llmChatRequestSchema>
