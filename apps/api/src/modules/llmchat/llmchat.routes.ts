import {chatRoleSchema, type LlmChatRequest} from '@heritagemonitor/shared'
import type {FastifyInstance} from 'fastify'
import {streamLlmChat} from './llmchat.service.js'

// Transport layer: SSE framing only, no business logic. See RULES.md rule 9
// (plain functions over controller classes) and rule 14 (modules own their
// own routes).
//
// The reply is hijacked so we can write text/event-stream frames directly as
// they're produced — this also keeps foundation.ts's @fastify/compress
// plugin (an onSend hook) from gzip-buffering a token-by-token stream and
// destroying the "streamed" UX. As long as the response is completed via
// reply.raw (which it is, below), Fastify's onResponse hooks — request
// logging, request metrics — still fire normally.
export async function llmchatRoutes(fastify: FastifyInstance) {
    fastify.post<{Body: LlmChatRequest}>(
        '/llmchat/stream',
        {
            schema: {
                body: {
                    type: 'object',
                    properties: {
                        messages: {
                            type: 'array',
                            minItems: 1,
                            items: {
                                type: 'object',
                                properties: {
                                    role: {type: 'string', enum: chatRoleSchema.options},
                                    content: {type: 'string', minLength: 1},
                                },
                                required: ['role', 'content'],
                            },
                        },
                        context: {type: 'array', items: {type: 'string'}},
                        sourceUrls: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    label: {type: 'string'},
                                    url: {type: 'string', format: 'uri'},
                                },
                                required: ['label', 'url'],
                            },
                        },
                    },
                    required: ['messages'],
                },
            },
        },
        async (request, reply) => {
            reply.hijack()
            const res = reply.raw
            // getHeaders() first: hijacking takes over the raw response, which
            // skips every hook Fastify would otherwise run on send — including
            // @fastify/cors's onRequest hook that already set
            // Access-Control-Allow-Origin on the Reply object by this point.
            // Without re-applying it here, the browser gets a 200 with a valid
            // body but no CORS header and silently reports it to JS as a
            // network failure.
            res.writeHead(200, {
                ...(reply.getHeaders() as Record<string, string>),
                'Content-Type': 'text/event-stream',
                // noStore.ts's sitewide Cache-Control: no-store also runs on
                // onSend, so it never reaches this response either — set here
                // for the same reason as the CORS header above.
                'Cache-Control': 'no-store',
                Connection: 'keep-alive',
            })
            // A client that disconnects mid-stream still triggers writes racing
            // the closed socket — swallow rather than crash the process, and
            // stop iterating instead of writing into the void.
            res.on('error', () => {})

            const controller = new AbortController()
            let clientClosed = false
            // `res`, not `request.raw` — Node fires the *request* stream's
            // 'close' as soon as its body is fully read (i.e. almost
            // immediately for a small POST), which is not the same as the
            // client disconnecting. The response stream's 'close' correctly
            // fires only when the underlying connection actually ends.
            res.once('close', () => {
                clientClosed = true
                controller.abort()
            })

            for await (const event of streamLlmChat(request.body, controller.signal)) {
                if (clientClosed) break
                res.write(`data: ${JSON.stringify(event)}\n\n`)
            }

            if (!clientClosed) res.end()
        },
    )
}
