import type { RagQuestionCandidate } from "./retriever";
import type { RagQuestionContext } from "@/lib/domain/types";

export type WebEvidence = {
  title: string;
  url: string;
  snippet: string;
  publishedAt?: string;
  retrievedAt: string;
};

export function shouldSearchWeb(value: string) {
  return /(最新|最近|近期|当前|今天|本周|本月|今年|市场新闻|market news|latest|recent|current|today|202[5-9]|上市规则|监管政策|IPO案例|财报|估值水平)/i.test(value);
}

export async function refineQuestionsWithLlm(input: {
  query: string;
  targetRole: string;
  candidates: RagQuestionCandidate[];
}) {
  const prompt = [
    "你是专业面试问题设计器。只能基于给定的简历证据、私有知识库证据和联网搜索证据生成问题，不得虚构候选人经历。",
    "保持每道问题原本考察能力，但让问题更自然、更专业、更贴近目标岗位。",
    "如使用最新市场事实，必须在问题或预期信号中注明数据日期；证据不足时保留原问题。",
    `目标岗位：${input.targetRole}`,
    `检索请求：${input.query}`,
    `候选题：${JSON.stringify(input.candidates.map((item, index) => ({
      index,
      prompt: item.prompt,
      expectation: item.expectation,
      competency: item.context.competencyLabel,
      resumeEvidence: item.context.evidence,
      knowledgeEvidence: item.context.knowledgeEvidence
    })))}`,
    '仅返回JSON：{"questions":[{"index":0,"prompt":"...","expectation":"..."}]}'
  ].join("\n\n");
  const result = await callArkRag(prompt, shouldSearchWeb(input.query));
  if (!result) return { candidates: input.candidates, webEvidence: [] as WebEvidence[] };
  const refined = input.candidates.map((candidate, index) => {
    const update = result.json.questions?.find((item) => item.index === index);
    return update?.prompt
      ? { ...candidate, prompt: update.prompt, expectation: update.expectation || candidate.expectation }
      : candidate;
  });
  return { candidates: refined, webEvidence: result.webEvidence };
}

export async function createLlmFollowUp(input: {
  question: string;
  answer: string;
  fallback: string;
  context?: RagQuestionContext;
}) {
  const query = `${input.question}\n${input.answer}`;
  const prompt = [
    "你是面试官。根据原问题、候选人回答、简历证据、知识库证据和必要的联网搜索，只追问一个最重要的缺口。",
    "不得补写简历事实；不得一次提出多个无关问题；如引用实时事实需写明日期。",
    `原问题：${input.question}`,
    `回答：${input.answer}`,
    `已识别的规则追问：${input.fallback}`,
    `上下文：${JSON.stringify(input.context ?? {})}`,
    '仅返回JSON：{"followUpQuestion":"..."}'
  ].join("\n\n");
  const result = await callArkRag(prompt, shouldSearchWeb(query));
  return {
    followUpQuestion: result?.json.followUpQuestion || input.fallback,
    webEvidence: result?.webEvidence ?? []
  };
}

async function callArkRag(prompt: string, useWeb: boolean): Promise<{
  json: { questions?: Array<{ index: number; prompt: string; expectation?: string }>; followUpQuestion?: string };
  webEvidence: WebEvidence[];
} | null> {
  const useArk = process.env.AI_PROVIDER === "ark";
  const apiKey = useArk
    ? process.env.ARK_API_KEY ?? process.env.AI_API_KEY
    : process.env.AI_API_KEY ?? process.env.DASHSCOPE_API_KEY;
  if (!apiKey || process.env.RAG_LLM_ENABLED === "false") return null;
  const baseUrl = (useArk
    ? process.env.ARK_API_BASE_URL ?? "https://ark.cn-beijing.volces.com/api/v3"
    : process.env.AI_API_BASE_URL ?? "https://dashscope.aliyuncs.com/compatible-mode/v1"
  ).replace(/\/+$/, "");
  const body: Record<string, unknown> = {
    model: useArk
      ? process.env.ARK_MODEL ?? "doubao-seed-2-0-pro-260215"
      : process.env.AI_MODEL ?? "qwen3.5-plus",
    input: [{ role: "user", content: [{ type: "input_text", text: prompt }] }]
  };
  if (useWeb && process.env.RAG_WEB_SEARCH_ENABLED !== "false") {
    body.tools = [{ type: "web_search" }];
  }
  try {
    let response = await request(body, baseUrl, apiKey);
    if (!response.ok && body.tools) {
      delete body.tools;
      response = await request(body, baseUrl, apiKey);
    }
    if (!response.ok) return null;
    const payload = await response.json();
    const text = extractText(payload);
    if (!text) return null;
    return { json: parseJson(text), webEvidence: extractWebEvidence(payload) };
  } catch {
    return null;
  }
}

function request(body: Record<string, unknown>, baseUrl: string, apiKey: string) {
  return fetch(`${baseUrl}/responses`, {
    method: "POST",
    signal: AbortSignal.timeout(Number(process.env.RAG_PROVIDER_TIMEOUT_MS) || 20000),
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body)
  });
}

function extractText(payload: any): string {
  if (typeof payload?.output_text === "string") return payload.output_text;
  return (payload?.output ?? []).flatMap((item: any) => item?.content ?? [])
    .map((item: any) => item?.text ?? "").filter(Boolean).join("\n");
}

function parseJson(text: string) {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  return JSON.parse(start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned);
}

function extractWebEvidence(payload: any): WebEvidence[] {
  const serialized = JSON.stringify(payload);
  const urls = [...serialized.matchAll(/https?:\\?\/\\?\/[^"\\\s]+/g)]
    .map((match) => match[0].replace(/\\\//g, "/"));
  return [...new Set(urls)].slice(0, 8).map((url) => ({
    title: new URL(url).hostname,
    url,
    snippet: "Source returned by the LLM web-search tool.",
    retrievedAt: new Date().toISOString()
  }));
}
