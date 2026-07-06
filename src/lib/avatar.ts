/** URL สาธารณะของรูปพนักงานใน bucket avatars (path เก็บใน profiles.photo_path) */
export function avatarUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${path}`;
}
