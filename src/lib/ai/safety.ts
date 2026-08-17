export class UnsafeAnswerError extends Error {
  constructor(message = "回答包含敏感凭据、隐私或攻击性指令，请删除后重试。") {
    super(message);
    this.name = "UnsafeAnswerError";
  }
}

export function assertSafeInterviewAnswer(answer: string) {
  const blocked = [
    /-----BEGIN (?:RSA |OPENSSH )?PRIVATE KEY-----/i,
    /(?:password|密码)\s*[:：=]\s*\S{6,}/i,
    /(?:api[_ -]?key|secret)\s*[:：=]\s*\S{8,}/i,
    /泄露.*(?:私人|隐私|密码)|绕过.*(?:安全|权限)|攻击.*系统/i
  ];
  if (blocked.some((pattern) => pattern.test(answer)) || detectPromptInjection(answer)) {
    throw new UnsafeAnswerError();
  }
}

export function detectPromptInjection(value: string) {
  const patterns: Array<[string, RegExp]> = [
    [
      "IGNORE_INSTRUCTIONS",
      /ignore\s+(?:all\s+)?(?:previous|prior|system)\s+instructions|忽略(?:之前|以上|系统)指令/i
    ],
    [
      "SYSTEM_PROMPT_EXFILTRATION",
      /(?:reveal|print|show|输出|泄露).{0,20}(?:system prompt|系统提示词|developer message)/i
    ],
    [
      "UNAUTHORIZED_TOOL",
      /(?:call|invoke|调用).{0,20}(?:admin|delete|update_training_state|其他用户|another user)/i
    ],
    ["ROLE_OVERRIDE", /you are now|act as root|进入开发者模式|你现在是(?:系统|管理员)/i]
  ];
  return patterns.find(([, pattern]) => pattern.test(value))?.[0] ?? null;
}

export function isSafeRetrievedContent(value: string) {
  return detectPromptInjection(value) === null;
}
