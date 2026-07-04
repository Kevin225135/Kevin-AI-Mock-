"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, Shield, UserRound } from "lucide-react";
import type { CurrentUser } from "@/lib/domain/types";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

type UsagePayload = {
  usage: {
    planCode: string;
    remaining: number | null;
    sessionsUsed: number;
    effectiveLimit: number | null;
  };
};

export function UserMenu() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [usage, setUsage] = useState<UsagePayload["usage"] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const meResponse = await fetch("/api/auth/me");
      if (!meResponse.ok) {
        if (!cancelled) {
          setIsLoading(false);
        }
        return;
      }
      const mePayload = (await meResponse.json()) as { user: CurrentUser };
      const usageResponse = await fetch("/api/usage/me");
      const usagePayload = usageResponse.ok
        ? ((await usageResponse.json()) as UsagePayload)
        : null;

      if (!cancelled) {
        setUser(mePayload.user);
        setUsage(usagePayload?.usage ?? null);
        setIsLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setUsage(null);
    router.push("/login");
    router.refresh();
  }

  if (isLoading) {
    return null;
  }

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Button asChild variant="secondary" size="sm">
          <Link href="/login">登录</Link>
        </Button>
        <Button asChild size="sm">
          <Link href="/register">注册</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Badge tone={user.role === "ADMIN" ? "coral" : "teal"}>
        {user.role === "ADMIN" ? "Admin" : user.planCode}
      </Badge>
      {usage ? (
        <Badge tone="slate">
          {usage.remaining === null
            ? "无限额度"
            : `剩余 ${usage.remaining}/${usage.effectiveLimit}`}
        </Badge>
      ) : null}
      {user.role === "ADMIN" ? (
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/users">
            <Shield className="size-4" />
            管理
          </Link>
        </Button>
      ) : null}
      <Button asChild variant="ghost" size="sm">
        <Link href="/account">
          <UserRound className="size-4" />
          账户
        </Link>
      </Button>
      <Button variant="ghost" size="sm" onClick={logout}>
        <LogOut className="size-4" />
        退出
      </Button>
    </div>
  );
}
