const baseUrl = (process.env.AI_API_BASE_URL ?? "").replace(/\/+$/, "");
const apiKey = process.env.AI_API_KEY;
const model = process.env.AI_MODEL;

if (!baseUrl || !apiKey || !model) {
  throw new Error("AI_API_BASE_URL, AI_API_KEY and AI_MODEL are required.");
}

async function check(path: string, body: object) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    signal: AbortSignal.timeout(30000),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });
  const payload = await response.json().catch(() => ({}));
  return {
    endpoint: path,
    status: response.status,
    ok: response.ok,
    errorCode: payload?.error?.code ?? null,
    errorType: payload?.error?.type ?? null,
    hasOutput: Boolean(
      payload?.choices?.[0]?.message?.content ||
      payload?.output_text ||
      payload?.output?.some?.((item: any) => item?.content?.length)
    ),
    sourceCount: JSON.stringify(payload).match(/https?:\\?\/\\?\//g)?.length ?? 0
  };
}

async function main() {
  const chat = await check("/chat/completions", {
    model,
    messages: [{ role: "user", content: "Reply with OK only." }],
    max_tokens: 8
  });
  const search = await check("/responses", {
    model,
    input: "Search for the current date and reply with one sentence.",
    tools: [{ type: "web_search" }]
  });
  console.log(JSON.stringify({ provider: "dashscope", model, chat, search }, null, 2));
}

main();
