import { AppShell } from "@/components/app-shell";

export default function PrivacyPage() {
  return (
    <AppShell>
      <article className="mx-auto max-w-3xl space-y-6 px-5 py-10">
        <div>
          <p className="text-sm font-medium text-primary">Privacy & Data</p>
          <h2 className="mt-2 text-3xl font-semibold">隐私与数据说明</h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            本说明解释 AI Mock 面试教练为提供训练、评分和复盘功能所处理的数据。
          </p>
        </div>
        <section className="space-y-2">
          <h3 className="text-lg font-semibold">我们处理什么</h3>
          <p className="text-sm leading-7 text-muted-foreground">
            账户资料、训练配置、回答内容、评分结果，以及你主动上传的简历文本和结构化信息。原始简历文件不会落盘。
          </p>
        </section>
        <section className="space-y-2">
          <h3 className="text-lg font-semibold">用于什么</h3>
          <p className="text-sm leading-7 text-muted-foreground">
            数据仅用于生成面试问题、追问、评分、复盘、训练趋势和产品质量评测。公开分享报告必须由你主动创建。
          </p>
        </section>
        <section className="space-y-2">
          <h3 className="text-lg font-semibold">保存与删除</h3>
          <p className="text-sm leading-7 text-muted-foreground">
            简历默认保留不超过 365 天。你可以在练习配置中删除简历及其关联训练，也可以在账户页永久删除整个账户。删除操作不可恢复。
          </p>
        </section>
        <section className="space-y-2">
          <h3 className="text-lg font-semibold">分享链接</h3>
          <p className="text-sm leading-7 text-muted-foreground">
            分享链接默认 7 天后失效，你可以随时在报告页撤销。获得链接的人在有效期内可以查看该报告，请勿分享包含敏感信息的内容。
          </p>
        </section>
        <p className="border-t border-black/10 pt-5 text-xs text-muted-foreground">
          更新日期：2026-07-31
        </p>
      </article>
    </AppShell>
  );
}
