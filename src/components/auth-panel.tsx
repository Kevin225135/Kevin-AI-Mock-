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
import { useLocale } from "./locale-provider";

type AuthPanelProps = {
  mode: "login" | "register";
};

export function AuthPanel({ mode }: AuthPanelProps) {
  const router = useRouter();
  const { t } = useLocale();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
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
              targetRole: targetRole.trim() || undefined,
              privacyAccepted
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
    <Card className="mx-auto w-full max-w-md">
      <CardHeader className="border-b border-black/[0.08]">
        <CardTitle className="text-2xl tracking-subheading">
          {isRegister ? t("创建账户", "Create account") : t("登录账户", "Sign in")}
        </CardTitle>
        <CardDescription>
          {isRegister
            ? t("注册后即可获得本月免费 Mock 额度。", "Create an account to receive this month's free Mock quota.")
            : t("登录后继续你的面试训练。", "Sign in to continue your interview practice.")}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <form className="space-y-4" onSubmit={submit}>
          {isRegister ? (
            <>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-foreground">{t("姓名", "Name")}</span>
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder={t("可选", "Optional")}
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-foreground">{t("目标岗位", "Target role")}</span>
                <Input
                  value={targetRole}
                  onChange={(event) => setTargetRole(event.target.value)}
                  placeholder="Product Manager"
                />
              </label>
            </>
          ) : null}

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-foreground">{t("邮箱", "Email")}</span>
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-foreground">{t("密码", "Password")}</span>
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={isRegister ? "new-password" : "current-password"}
              minLength={isRegister ? 8 : undefined}
              required
            />
          </label>

          {isRegister ? (
            <label className="flex items-start gap-2.5 rounded-button border border-black/10 bg-secondary/30 p-3 text-sm leading-relaxed">
              <input
                type="checkbox"
                checked={privacyAccepted}
                onChange={(event) => setPrivacyAccepted(event.target.checked)}
                required
                className="mt-1 size-4 accent-primary"
              />
              <span>
                {t("我已阅读并同意", "I have read and agree to the")}{" "}
                <Link className="font-medium text-primary hover:underline" href="/privacy" target="_blank">
                  {t("隐私与数据说明", "Privacy and data notice")}
                </Link>
                {t("，包括面试回答和简历文本的处理方式。", ", including how interview answers and resume text are processed.")}
              </span>
            </label>
          ) : null}

          {error ? (
            <p className="rounded-button bg-destructive/8 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={isSubmitting || (isRegister && !privacyAccepted)}
          >
            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
            {isRegister ? <UserPlus className="size-4" /> : <LogIn className="size-4" />}
            {isRegister ? t("注册并登录", "Create account") : t("登录", "Sign in")}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          {isRegister ? t("已有账户？", "Already have an account?") : t("还没有账户？", "New here?")}{" "}
          <Link
            className="font-medium text-primary hover:underline"
            href={isRegister ? "/login" : "/register"}
          >
            {isRegister ? t("去登录", "Sign in") : t("去注册", "Create account")}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
