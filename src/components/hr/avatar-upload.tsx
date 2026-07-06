"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/hr/avatar";

/**
 * อัปโหลดรูปพนักงานเข้า bucket avatars แล้วอัปเดต profiles.photo_path
 * - mode "admin": อัปเดตแถวของ userId ตรงๆ (ต้องเป็น hr_admin ตาม RLS)
 * - mode "self": อัปเดตรูปของตัวเองผ่าน RPC update_my_photo
 */
export function AvatarUpload({
  userId,
  name,
  photoPath,
  mode,
  size = 64,
}: {
  userId: string;
  name: string;
  photoPath: string | null;
  mode: "admin" | "self";
  size?: number;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    if (file.size > 2 * 1024 * 1024) {
      setError("รูปต้องไม่เกิน 2MB");
      return;
    }
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${userId}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { contentType: file.type, upsert: true });
    if (uploadError) {
      setBusy(false);
      setError("อัปโหลดไม่สำเร็จ");
      return;
    }

    const { error: updateError } =
      mode === "self"
        ? await supabase.rpc("update_my_photo", { p_path: path })
        : await (async () => {
            const { error } = await supabase
              .from("profiles")
              .update({ photo_path: path })
              .eq("id", userId);
            return { error };
          })();

    setBusy(false);
    if (updateError) {
      setError("บันทึกรูปไม่สำเร็จ");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3">
      <Avatar photoPath={photoPath} name={name} size={size} />
      <div>
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="rounded-lg bg-stone-100 px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-200 disabled:opacity-50"
        >
          {busy ? "กำลังอัปโหลด..." : photoPath ? "เปลี่ยนรูป" : "อัปโหลดรูป"}
        </button>
        {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
