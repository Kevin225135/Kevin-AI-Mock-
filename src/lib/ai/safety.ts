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
  if (blocked.some((pattern) => pattern.test(answer))) throw new UnsafeAnswerError();
}
