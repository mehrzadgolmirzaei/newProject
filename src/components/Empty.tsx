import { Icon, type IconName } from "./Icon";

export function Empty({ icon = "inbox", title, text, children }: { icon?: IconName; title: string; text?: string; children?: React.ReactNode }) {
  return (
    <div className="empty">
      <Icon name={icon} />
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {children}
    </div>
  );
}
