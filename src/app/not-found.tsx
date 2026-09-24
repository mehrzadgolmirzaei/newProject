import Link from "next/link";
import { Empty } from "@/components/Empty";

export default function NotFound() {
  return (
    <div className="wrap" style={{ paddingBlock: 80 }}>
      <Empty icon="search" title="صفحه پیدا نشد" text="ممکن است این مورد حذف یا بایگانی شده باشد، یا نشانی اشتباه باشد.">
        <Link href="/cases" className="btn btn-primary">اطلس موارد</Link>
      </Empty>
    </div>
  );
}
