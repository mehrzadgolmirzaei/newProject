"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteComment, editComment, moderateComment, postComment } from "@/actions/learn";
import { Icon } from "../Icon";
import { initials } from "@/lib/text";
import { useI18n } from "../LocaleProvider";

export type CommentNode = {
  id: string;
  body: string;
  status: "VISIBLE" | "HIDDEN" | "DELETED";
  pinned: boolean;
  createdAt: Date;
  editedAt: Date | null;
  author: { id: string; name: string | null; specialty: string | null; role: string };
  replies?: CommentNode[];
};

type Ctx = { caseId: string; meId: string | null; canPost: boolean; canModerate: boolean; caseAuthorId: string };

export function Discussion({ nodes, ctx, blocked, closed }: { nodes: CommentNode[]; ctx: Ctx; blocked?: string; closed?: boolean }) {
  const { t, f } = useI18n();
  const count = nodes.reduce((n, c) => n + (c.status === "VISIBLE" ? 1 : 0) + (c.replies?.filter((r) => r.status === "VISIBLE").length ?? 0), 0);
  return (
    <section className="doc-section" id="discussion">
      <h2><Icon name="message" /> {t("نظرات همکاران")} {count > 0 && <span className="badge">{f.num(count)}</span>}</h2>
      {blocked ? (
        <div className="locked"><Icon name="lock" /> {blocked}</div>
      ) : (
        <div className="stack gap-16">
          {nodes.length === 0 && <p className="muted" style={{ fontSize: 14 }}>{t("هنوز نظری برای این مورد ثبت نشده است.")}</p>}
          <div className="thread">
            {nodes.map((n) => <Comment key={n.id} n={n} ctx={ctx} />)}
          </div>
          {closed && (
            <div className="locked"><Icon name="lock" /> {t("ارائه‌دهنده گفت‌وگو را برای این مورد بسته است")}{ctx.canModerate ? t("؛ فقط شما و مدیر سامانه می‌توانید نظر بنویسید.") : "."}</div>
          )}
          {ctx.canPost && <Composer ctx={ctx} />}
        </div>
      )}
    </section>
  );
}

function Comment({ n, ctx, isReply }: { n: CommentNode; ctx: Ctx; isReply?: boolean }) {
  const router = useRouter();
  const { t, f, locale } = useI18n();
  const [replying, setReplying] = useState(false);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(n.body);
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();
  const mine = ctx.meId === n.author.id;
  const act = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) setErr(r.error ?? t("خطا"));
      else { setErr(""); setEditing(false); router.refresh(); }
    });

  const deleted = n.status === "DELETED";
  return (
    <div className={`cmt${n.pinned ? " pinned" : ""}${n.status === "HIDDEN" ? " hidden" : ""}`}>
      <span className="avatar">{initials(n.author.name)}</span>
      <div>
        <div className="cmt-card">
          <div className="cmt-head">
            <b>{deleted ? "—" : n.author.name}</b>
            {!deleted && n.author.id === ctx.caseAuthorId && <span className="badge badge-teaching" style={{ height: 20 }}>{t("ارائه‌دهنده")}</span>}
            {!deleted && n.author.specialty && <span>{n.author.specialty}</span>}
            <span>·</span>
            <span title={new Date(n.createdAt).toLocaleString(locale === "en" ? "en-GB" : "fa-IR")}>{f.ago(n.createdAt)}</span>
            {n.editedAt && <span>{t("(ویرایش‌شده)")}</span>}
            {n.pinned && <span className="badge badge-accent" style={{ height: 20 }}><Icon name="pin" /> {t("نکته‌ی آموزشی")}</span>}
            {n.status === "HIDDEN" && <span className="badge badge-warn" style={{ height: 20 }}>{t("پنهان")}</span>}
          </div>
          {editing ? (
            <div className="stack gap-8" style={{ marginTop: 8 }}>
              <textarea className="textarea" value={text} onChange={(e) => setText(e.target.value)} dir="auto" />
              <div className="row">
                <button className="btn btn-primary btn-sm" disabled={pending} onClick={() => act(() => editComment({ id: n.id, body: text }))}>{t("ذخیره")}</button>
                <button className="btn btn-ghost btn-sm" onClick={() => { setEditing(false); setText(n.body); }}>{t("انصراف")}</button>
              </div>
            </div>
          ) : (
            <div className={`cmt-body${deleted ? " deleted" : ""}`} dir="auto">{deleted ? t("این نظر توسط نویسنده حذف شده است.") : n.body}</div>
          )}
        </div>
        {!deleted && !editing && (
          <div className="cmt-tools">
            {ctx.canPost && !isReply && <button onClick={() => setReplying((r) => !r)}><Icon name="reply" /> {t("پاسخ")}</button>}
            {mine && n.status === "VISIBLE" && <button onClick={() => setEditing(true)}><Icon name="pencil" /> {t("ویرایش")}</button>}
            {mine && <button onClick={() => confirm(t("این نظر حذف شود؟")) && act(() => deleteComment(n.id))}><Icon name="trash" /> {t("حذف")}</button>}
            {ctx.canModerate && !isReply && n.status === "VISIBLE" && (
              <button onClick={() => act(() => moderateComment({ id: n.id, action: n.pinned ? "unpin" : "pin" }))}>
                <Icon name="pin" /> {n.pinned ? t("برداشتن سنجاق") : t("سنجاق به‌عنوان نکته‌ی آموزشی")}
              </button>
            )}
            {ctx.canModerate && !mine && (
              <button onClick={() => act(() => moderateComment({ id: n.id, action: n.status === "HIDDEN" ? "restore" : "hide" }))}>
                <Icon name={n.status === "HIDDEN" ? "eye" : "eyeOff"} /> {n.status === "HIDDEN" ? t("نمایش دوباره") : t("پنهان‌کردن")}
              </button>
            )}
          </div>
        )}
        {err && <div className="alert alert-danger" style={{ marginTop: 6 }}>{err}</div>}
        {(n.replies?.length || replying) && (
          <div className="replies">
            {n.replies?.map((r) => <Comment key={r.id} n={r} ctx={ctx} isReply />)}
            {replying && <Composer ctx={ctx} parentId={n.id} onDone={() => setReplying(false)} compact />}
          </div>
        )}
      </div>
    </div>
  );
}

function Composer({ ctx, parentId, onDone, compact }: { ctx: Ctx; parentId?: string; onDone?: () => void; compact?: boolean }) {
  const router = useRouter();
  const { t } = useI18n();
  const [body, setBody] = useState("");
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();
  return (
    <form
      className="composer"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await postComment({ caseId: ctx.caseId, parentId: parentId ?? null, body });
          if (!r.ok) setErr(r.error);
          else { setBody(""); setErr(""); onDone?.(); router.refresh(); }
        });
      }}
    >
      <textarea
        className="textarea"
        style={compact ? { minHeight: 80 } : undefined}
        placeholder={parentId ? t("پاسخ شما…") : t("تشخیص افتراقی، نکته‌ی ریخت‌شناسی، رنگ‌آمیزی پیشنهادی یا پرسش خود را بنویسید…")}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        dir="auto"
        maxLength={5000}
      />
      {err && <div className="alert alert-danger">{err}</div>}
      <div className="composer-foot">
        <button className="btn btn-primary btn-sm" disabled={pending || body.trim().length < 2}>
          <Icon name="send" /> {pending ? t("در حال ارسال…") : parentId ? t("ارسال پاسخ") : t("ارسال نظر")}
        </button>
        {onDone && <button type="button" className="btn btn-ghost btn-sm" onClick={onDone}>{t("انصراف")}</button>}
        <span className="spacer" />
        {!compact && <small>{t("نظرها با نام شما منتشر می‌شوند. از درج هرگونه اطلاعات هویتی بیمار خودداری کنید.")}</small>}
      </div>
    </form>
  );
}
