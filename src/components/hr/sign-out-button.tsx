"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      className="w-full rounded-lg px-3 py-2 text-left text-sm text-stone-400 hover:bg-stone-800 hover:text-white"
      onClick={async () => {
        await createClient().auth.signOut();
        router.push("/hr/login");
        router.refresh();
      }}
    >
      ออกจากระบบ
    </button>
  );
}
