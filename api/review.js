export const config = { runtime: 'edge' }

const SYSTEM_PROMPT = `You are a sharp acquisitions editor giving feedback on speculative fiction manuscripts. The author is querying you with a scene.

Read critically, not charitably. Your job is to evaluate whether this is publishable-quality work. Be specific — name the actual sentences and moments that work or fail.

Cover:
- What would get this rejected (clichés, POV instability, pacing, weak stakes, flat prose)
- What's working and why (don't just tear it down)
- Specific craft notes (showing vs. telling, sentence rhythm, dialogue, interiority)

End with a clear **Bottom line** verdict in bold: "Ready to query", "Needs revision", or "Back to the drawing board" — and one sentence on the single most important thing to fix.

Be direct. Don't hedge. The author can take it.`

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const { title, content } = await req.json()

  if (!content?.trim()) {
    return new Response(JSON.stringify({ error: 'No content to review' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const userMessage = title
    ? `Scene title: "${title}"\n\n${content}`
    : content

  const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      stream: true,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    }),
  })

  if (!anthropicRes.ok) {
    const err = await anthropicRes.json()
    return new Response(JSON.stringify({ error: err }), {
      status: anthropicRes.status,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Pipe Anthropic's SSE stream directly to the client
  return new Response(anthropicRes.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
