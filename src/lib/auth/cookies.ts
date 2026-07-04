import { NextResponse } from "next/server";

export const accessTokenCookie = "ai_mock_access";
export const refreshTokenCookie = "ai_mock_refresh";

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export function setAuthCookies(response: NextResponse, tokens: AuthTokens) {
  response.cookies.set(accessTokenCookie, tokens.accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: getAccessTokenMaxAge()
  });
  response.cookies.set(refreshTokenCookie, tokens.refreshToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: getRefreshTokenMaxAge()
  });
}

export function clearAuthCookies(response: NextResponse) {
  for (const name of [accessTokenCookie, refreshTokenCookie]) {
    response.cookies.set(name, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0
    });
  }
}

export function readCookie(request: Request, name: string) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookies = cookieHeader.split(";").map((item) => item.trim());
  const prefix = `${name}=`;
  const cookie = cookies.find((item) => item.startsWith(prefix));
  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : undefined;
}

export function getRefreshTokenMaxAge() {
  const days = Number(process.env.AUTH_REFRESH_TOKEN_TTL_DAYS ?? 30);
  return Math.max(1, days) * 24 * 60 * 60;
}

function getAccessTokenMaxAge() {
  const minutes = Number(process.env.AUTH_ACCESS_TOKEN_TTL_MINUTES ?? 15);
  return Math.max(1, minutes) * 60;
}
