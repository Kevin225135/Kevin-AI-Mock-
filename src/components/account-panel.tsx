"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, Loader2, Save, Trash2 } from "lucide-react";
import type { CurrentUser, MockSession } from "@/lib/domain/types";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "./ui/card";
import { Input } from "./ui/input";

type UsageSnapshot = {
  planCode: string;
  periodStart: string;
  periodEnd: string;
  effectiveLimit: number | null;
  sessionsUsed: number;
  remaining: number | null;
};

export function AccountPanel() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [usage, setUsage] = useState<UsageSnapshot | null>(null);
  const [sessions, setSessions] = useState<MockSession[]>([]);
  const [name, setName] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const meResponse = await fetch("/api/auth/me");
      if (meResponse.status === 401) {
        router.push("/login?next=/account");
        return;
      }

      const [mePayload, usageResponse, sessionsResponse] = await Promise.all([
        meResponse.json() as Promise<{ user: CurrentUser }>,
        fetch("/api/usage/me"),
        fetch("/api/mock-sessions")
      ]);
      const usagePayload = usageResponse.ok
        ? ((await usageResponse.json()) as { usage: UsageSnapshot })
        : null;
      const sessionsPayload = sessionsResponse.ok
        ? ((await sessionsResponse.json()) as { sessions: MockSession[] })
        : null;

      if (!cancelled) {
        setUser(mePayload.user);
        setName(mePayload.user.name ?? "");
        setTargetRole(mePayload.user.targetRole ?? "");
        setUsage(usagePayload?.usage ?? null);
        setSessions(sessionsPayload?.sessions ?? []);
        setIsLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSaving(true);

    const response = await fetch("/api/users/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim() || undefined,
        targetRole: targetRole.trim() || undefined
      })
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(payload.error ?? "保存资料失败。");
    } else {
      setUser(payload.user);
      setMessage("资料已保存。");
      router.refresh();
    }
    setIsSaving(false);
  }

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSaving(true);

    const response = await fetch("/api/users/me/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword })
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(payload.error ?? "修改密码失败。");
      setIsSaving(false);
      return;
    }

    router.push("/login?next=/account");
  }

  async function deleteAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!window.confirm("确定永久删除账户和全部训练数据吗？此操作无法恢复。")) return;
    setError(null);
    setIsSaving(true);
    const response = await fetch("/api/users/me", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        password: deletePassword,
        confirmation: deleteConfirmation
      })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(payload.error ?? "删除账户失败。");
      setIsSaving(false);
      return;
    }
    router.push("/register");
    router.refresh();
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2.5 p-6 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-primary" />
          加载账户中...
        </CardContent>
      </Card>
    );
  }

  if (!user) return null;

  return (
    <div className="grid w-full gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <div className="space-y-6">
        <Card>
          <CardHeader className="border-b border-black/[0.08]">
            <Badge tone={user.role === "ADMIN" ? "coral" : "teal"} className="w-fit">
              {user.role}
            </Badge>
            <CardTitle className="mt-2 text-xl tracking-subheading">账户资料</CardTitle>
            <CardDescription>{user.email}</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form className="space-y-4" onSubmit={saveProfile}>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-foreground">姓名</span>
                <Input value={name} onChange={(event) => setName(event.target.value)} />
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-foreground">目标岗位</span>
                <Input
                  value={targetRole}
                  onChange={(event) => setTargetRole(event.target.value)}
                />
              </label>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                保存资料
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b border-black/[0.08]">
            <CardTitle className="tracking-card-title">修改密码</CardTitle>
            <CardDescription>修改后需要重新登录。</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form className="space-y-4" onSubmit={savePassword}>
              <Input
                type="password"
                placeholder="当前密码"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
              />
              <Input
                type="password"
                placeholder="新密码，至少 8 位"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                minLength={8}
                required
              />
              <Button type="submit" variant="secondary" disabled={isSaving}>
                修改密码
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-destructive/20">
          <CardHeader className="border-b border-destructive/15">
            <CardTitle className="tracking-card-title text-destructive">永久删除账户</CardTitle>
            <CardDescription>
              将删除账户、简历、训练回答、评分、报告和关联检索数据，且无法恢复。
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form className="space-y-3" onSubmit={deleteAccount}>
              <Input
                type="password"
                placeholder="当前密码"
                value={deletePassword}
                onChange={(event) => setDeletePassword(event.target.value)}
                required
              />
              <Input
                placeholder="输入 DELETE 确认"
                value={deleteConfirmation}
                onChange={(event) => setDeleteConfirmation(event.target.value)}
                required
              />
              <Button
                type="submit"
                variant="danger"
                disabled={
                  isSaving ||
                  !deletePassword ||
                  deleteConfirmation !== "DELETE"
                }
              >
                <Trash2 className="size-4" />
                永久删除账户
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader className="border-b border-black/[0.08]">
            <CardTitle className="tracking-card-title">本月额度</CardTitle>
            <CardDescription>
              {usage
                ? `${new Date(usage.periodStart).toLocaleDateString()} - ${new Date(
                    usage.periodEnd
                  ).toLocaleDateString()}`
                : "暂无额度数据"}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-2xl font-bold tabular-nums text-foreground">{usage?.planCode ?? "-"}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">套餐</p>
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums text-foreground">
                  {usage?.sessionsUsed ?? 0}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">已用</p>
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums text-foreground">
                  {usage?.remaining === null ? "∞" : usage?.remaining ?? 0}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">剩余</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {(message || error) ? (
          <p
            className={
              error
                ? "rounded-button bg-destructive/8 px-3 py-2 text-sm text-destructive"
                : "rounded-button bg-primary/8 px-3 py-2 text-sm text-primary"
            }
          >
            {error ?? message}
          </p>
        ) : null}

        <Card>
          <CardHeader className="border-b border-black/[0.08]">
            <CardTitle className="tracking-card-title">历史 Mock</CardTitle>
            <CardDescription>最近 50 场训练。</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">还没有历史场次。</p>
            ) : (
              <div className="space-y-2.5">
                {sessions.map((session) => (
                  <Link
                    key={session.id}
                    href={
                      session.status === "COMPLETED"
                        ? `/report/${session.id}`
                        : `/mock/${session.id}`
                    }
                    className="flex items-center justify-between gap-3 rounded-button border border-black/[0.08] bg-secondary/20 p-3 transition-colors hover:bg-secondary"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {session.targetRole} / {session.module}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {new Date(session.createdAt).toLocaleString()}
                      </span>
                    </span>
                    <Badge tone={session.status === "COMPLETED" ? "teal" : "amber"}>
                      <FileText className="mr-1 size-3" />
                      {session.status}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
