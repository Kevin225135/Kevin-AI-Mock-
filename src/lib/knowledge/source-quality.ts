const HIGH_AUTHORITY_HOSTS = [
  "gov.cn",
  "csrc.gov.cn",
  "sse.com.cn",
  "szse.cn",
  "hkex.com.hk",
  "hkma.gov.hk",
  "pbc.gov.cn",
  "bis.org",
  "imf.org",
  "worldbank.org",
  "openai.com",
  "alibabacloud.com",
  "aliyun.com"
];

const MEDIUM_AUTHORITY_HOSTS = [
  "reuters.com",
  "bloomberg.com",
  "ft.com",
  "wsj.com",
  "mckinsey.com",
  "bcg.com",
  "pwc.com",
  "kpmg.com",
  "deloitte.com",
  "ey.com"
];

export function inferSourceAuthority(sourceUrl: string) {
  try {
    const hostname = new URL(sourceUrl).hostname.toLowerCase();
    if (HIGH_AUTHORITY_HOSTS.some((host) =>
      hostname === host || hostname.endsWith(`.${host}`))) return 95;
    if (hostname.endsWith(".gov") || hostname.endsWith(".gov.uk")) return 95;
    if (hostname.endsWith(".edu") || hostname.endsWith(".edu.cn")) return 85;
    if (MEDIUM_AUTHORITY_HOSTS.some((host) =>
      hostname === host || hostname.endsWith(`.${host}`))) return 80;
  } catch {
    return 40;
  }
  return 60;
}

export function freshnessScore(input: {
  publishedAt: Date | null;
  lastVerifiedAt: Date | null;
  now?: Date;
}) {
  const reference = input.lastVerifiedAt ?? input.publishedAt;
  if (!reference) return 0.5;
  const ageDays = Math.max(
    0,
    ((input.now ?? new Date()).getTime() - reference.getTime()) / 86_400_000
  );
  return Math.exp(-ageDays / 365);
}

export function isFresh(input: {
  expiresAt: Date | null;
  publishedAt: Date | null;
  lastVerifiedAt?: Date | null;
  freshnessDays?: number;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  if (input.expiresAt && input.expiresAt <= now) return false;
  if (input.freshnessDays) {
    const reference = input.lastVerifiedAt ?? input.publishedAt;
    if (!reference) return false;
    return reference.getTime() >= now.getTime() - input.freshnessDays * 86_400_000;
  }
  return true;
}
