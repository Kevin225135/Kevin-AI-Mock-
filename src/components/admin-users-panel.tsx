"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, PlusCircle } from "lucide-react";
import type { CurrentUser, UserRole, UserStatus } from "@/lib/domain/types";
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

type AdminUser = CurrentUser & {
  createdAt: string;
  lastLoginAt?: string;
  usage: {
    planCode: string;
    effectiveLimit: number | null;
    sessionsUsed: number;
    remaining: number | null;
  };
};

export function AdminUsersPanel() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [adjustments, setAdjustments] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadUsers() {
    const response = await fetch("/api/admin/users");
    if (response.status === 401 || response.status === 403) {
      router.push("/login?next=/admin/users");
      return;
    }

    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error ?? "加载用户失败。");
    } else {
      setUsers(payload.users);
    }
    setIsLoading(false);
  }

  async function updateUser(
    userId: string,
    patch: Partial<{
      role: UserRole;
      status: UserStatus;
      planCode: string;
    }>
  ) {
    setBusyUserId(userId);
    setError(null);
    setMessage(null);

    const response = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch)
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(payload.error ?? "更新用户失败。");
    } else {
      setMessage("用户已更新。");
      await loadUsers();
    }
    setBusyUserId(null);
  }

  async function adjustQuota(userId: string) {
    const delta = Number(adjustments[userId]);
    if (!Number.isInteger(delta) || delta === 0) {
      setError("请输入非零整数额度调整值。");
      return;
    }

    setBusyUserId(userId);
    setError(null);
    setMessage(null);

    const response = await fetch(`/api/admin/users/${userId}/quota-adjustments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ delta, reason: "admin_panel" })
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(payload.error ?? "调整额度失败。");
    } else {
      setMessage("额度已调整。");
      setAdjustments((current) => ({ ...current, [userId]: "" }));
      await loadUsers();
    }
    setBusyUserId(null);
  }

  if (isLoading) {
    return (
      <Card className="shadow-panel">
        <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-primary" />
          加载用户
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden shadow-panel">
      <CardHeader className="border-b border-border/70 bg-card/60">
        <Badge tone="coral" className="w-fit">
          Admin
        </Badge>
        <CardTitle className="mt-2 text-2xl">用户管理</CardTitle>
        <CardDescription>管理账户状态、角色、套餐和本月额度。</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        {(message || error) ? (
          <p
            className={
              error
                ? "mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
                : "mb-4 rounded-md border border-primary/20 bg-primary/10 px-3 py-2 text-sm text-primary"
            }
          >
            {error ?? message}
          </p>
        ) : null}

        <div className="space-y-3">
          {users.map((user) => {
            const busy = busyUserId === user.id;

            return (
              <div
                key={user.id}
                className="grid gap-3 rounded-md border border-border/80 bg-background/50 p-4 lg:grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr_1fr]"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{user.email}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {user.name ?? "未填写姓名"} / {user.targetRole ?? "未填写岗位"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    注册 {new Date(user.createdAt).toLocaleString()}
                  </p>
                </div>

                <label className="space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground">角色</span>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
                    value={user.role}
                    disabled={busy}
                    onChange={(event) =>
                      updateUser(user.id, { role: event.target.value as UserRole })
                    }
                  >
                    <option value="USER">USER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </label>

                <label className="space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground">状态</span>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
                    value={user.status}
                    disabled={busy}
                    onChange={(event) =>
                      updateUser(user.id, { status: event.target.value as UserStatus })
                    }
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                  </select>
                </label>

                <label className="space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground">套餐</span>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
                    value={user.planCode}
                    disabled={busy}
                    onChange={(event) => updateUser(user.id, { planCode: event.target.value })}
                  >
                    <option value="FREE">FREE</option>
                    <option value="PRO">PRO</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </label>

                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <Badge tone="slate">
                      已用 {user.usage.sessionsUsed}
                      {user.usage.effectiveLimit === null
                        ? " / 无限"
                        : ` / ${user.usage.effectiveLimit}`}
                    </Badge>
                    <Badge tone="teal">
                      剩余 {user.usage.remaining === null ? "∞" : user.usage.remaining}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="+3 / -1"
                      value={adjustments[user.id] ?? ""}
                      onChange={(event) =>
                        setAdjustments((current) => ({
                          ...current,
                          [user.id]: event.target.value
                        }))
                      }
                    />
                    <Button
                      size="icon"
                      variant="secondary"
                      disabled={busy}
                      onClick={() => adjustQuota(user.id)}
                      aria-label="调整额度"
                    >
                      {busy ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <PlusCircle className="size-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
