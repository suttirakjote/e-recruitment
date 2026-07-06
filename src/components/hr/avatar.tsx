import { avatarUrl } from "@/lib/avatar";
import { cn } from "@/components/ui";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
}

/** รูปพนักงาน — แสดง path ถ้ามี ไม่มีก็เป็นวงกลมตัวอักษรย่อ */
export function Avatar({
  photoPath,
  name,
  size = 40,
  className,
}: {
  photoPath: string | null | undefined;
  name: string;
  size?: number;
  className?: string;
}) {
  const url = avatarUrl(photoPath);
  const style = { width: size, height: size, fontSize: size * 0.4 };

  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name}
        style={style}
        className={cn("shrink-0 rounded-full border border-stone-200 object-cover", className)}
      />
    );
  }
  return (
    <span
      style={style}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-emerald-100 font-medium text-emerald-800",
        className
      )}
    >
      {initials(name)}
    </span>
  );
}
