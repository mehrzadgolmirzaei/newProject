// نمایش متن ساده با پاراگراف و فهرست. خطوطی که با «-» یا «•» شروع شوند فهرست می‌شوند.
// جهت هر پاراگراف خودکار تشخیص داده می‌شود (متن انگلیسی چپ‌چین نمایش داده می‌شود).
export function Prose({ text, className = "prose" }: { text: string; className?: string }) {
  const blocks: ({ type: "p"; text: string } | { type: "ul"; items: string[] })[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) {
      blocks.push({ type: "p", text: "" });
      continue;
    }
    const m = /^[-•*]\s+(.*)$/.exec(line);
    const last = blocks[blocks.length - 1];
    if (m) {
      if (last?.type === "ul") last.items.push(m[1]);
      else blocks.push({ type: "ul", items: [m[1]] });
    } else if (last?.type === "p" && last.text) {
      last.text += "\n" + line;
    } else {
      blocks.push({ type: "p", text: line });
    }
  }
  return (
    <div className={className}>
      {blocks.map((b, i) =>
        b.type === "ul" ? (
          <ul key={i}>{b.items.map((it, j) => <li key={j} dir="auto">{it}</li>)}</ul>
        ) : b.text ? (
          <p key={i} dir="auto" style={{ whiteSpace: "pre-line" }}>{b.text}</p>
        ) : null,
      )}
    </div>
  );
}
