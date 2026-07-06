import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function PrivacyNoticePage() {
  const settings = await getSettings(["privacy_notice_html"]);
  const html = (settings.privacy_notice_html as string) || "<p>ยังไม่มีประกาศ</p>";

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <article
        className="prose prose-stone rounded-xl border border-stone-200 bg-white p-8 leading-7 shadow-sm [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-bold [&_p]:mb-3"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
