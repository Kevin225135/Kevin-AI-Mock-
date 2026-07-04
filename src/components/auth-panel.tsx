"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, LogIn, UserPlus } from "lucide-react";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "./ui/card";
import { Input } from "./ui/input";

type AuthPanelProps = {
  mode: "login" | "register";
};

export function AuthPanel({ mode }: AuthPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isRegister = mode === "register";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const response = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        ...(isRegister
          ? {
              name: name.trim() || undefined,
              targetRole: targetRole.trim() || undefined
            }
          : {})
      })
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(payload.error ?? "Authentication failed.");
      setIsSubmitting(false);
      return;
    }

    router.push(searchParams.get("next") || "/");
    router.refresh();
  }

  return (
    <Card className="mx-auto w-full max-w-md overflow-hidden shadow-panel">
      <CardHeader className="border-b border-border/70 bg-card/60">
        <CardTitle className="text-2xl">
          {isRegister ? "创建账户" : "登录账户"}
        </CardTitle>
        <CardDescription className="leading-6">
          {isRegister
            ? "注册后即可获得本月免费 Mock 额度。"
            : "登录后继续你的面试训练。"}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <form className="space-y-4" onSubmit={submit}>
          {isRegister ? (
            <>
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-foreground">姓名</span>
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="可选"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-foreground">目标岗位</span>
                <Input
                  value={targetRole}
                  onChange={(event) => setTargetRole(event.target.value)}
                  placeholder="Product Manager"
                />
              </label>
            </>
          ) : null}

          <label className="block space-y-2">
            <span className="text-sm font-semibold text-foreground">邮箱</span>
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-foreground">密码</span>
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={isRegister ? "new-password" : "current-password"}
              minLength={isRegister ? 8 : undefined}
              required
            />
          </label>

          {error ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </p>
          ) : null}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
            {isRegister ? <UserPlus className="size-4" /> : <LogIn className="size-4" />}
            {isRegister ? "注册并登录" : "登录"}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          {isRegister ? "已有账户？" : "还没有账户？"}{" "}
          <Link
            className="font-semibold text-primary hover:underline"
            href={isRegister ? "/login" : "/register"}
          >
            {isRegister ? "去登录" : "去注册"}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
