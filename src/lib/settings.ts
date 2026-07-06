import { createClient } from "@/lib/supabase/server";

export async function getSettings(keys: string[]) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("site_settings")
    .select("key, value")
    .in("key", keys);
  const map: Record<string, unknown> = {};
  for (const row of data ?? []) map[row.key] = row.value;
  return map;
}

export async function getOrgName(): Promise<string> {
  const settings = await getSettings(["org_name"]);
  return (settings.org_name as string) || "องค์กรของเรา";
}

/** URL สาธารณะของโลโก้ใน bucket branding (path เก็บใน site_settings.org_logo_path) */
export function logoUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/branding/${path}`;
}

export interface Branding {
  orgName: string;
  logoPath: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
}

export async function getBranding(): Promise<Branding> {
  const s = await getSettings(["org_name", "org_logo_path", "primary_color"]);
  const logoPath = (s.org_logo_path as string) || null;
  return {
    orgName: (s.org_name as string) || "องค์กรของเรา",
    logoPath,
    logoUrl: logoUrl(logoPath),
    primaryColor: (s.primary_color as string) || null,
  };
}
