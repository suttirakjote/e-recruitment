/** พรีวิวไฟล์ CV ในหน้า — PDF ฝังตรง, Word ผ่าน Office viewer, อื่นๆ ให้ดาวน์โหลด */
export function CvPreview({ url, fileName }: { url: string; fileName: string }) {
  const lower = fileName.toLowerCase();
  const isPdf = lower.endsWith(".pdf");
  const isWord = lower.endsWith(".doc") || lower.endsWith(".docx");

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
        <span className="font-medium text-stone-700">{fileName}</span>
        <a href={url} target="_blank" rel="noopener noreferrer"
          className="text-emerald-700 hover:underline">
          เปิดในแท็บใหม่ ↗
        </a>
        <a href={url} download={fileName}
          className="text-stone-500 hover:underline">
          ⬇ ดาวน์โหลด
        </a>
      </div>

      {isPdf && (
        <iframe
          src={`${url}#view=FitH`}
          className="h-[640px] w-full rounded-lg border border-stone-200"
          title={`CV: ${fileName}`}
        />
      )}

      {isWord && (
        <iframe
          src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`}
          className="h-[640px] w-full rounded-lg border border-stone-200"
          title={`CV: ${fileName}`}
        />
      )}

      {!isPdf && !isWord && (
        <p className="rounded-lg bg-stone-50 p-4 text-sm text-stone-500">
          ไม่รองรับการแสดงตัวอย่างไฟล์ประเภทนี้ กรุณาดาวน์โหลดเพื่อเปิดดู
        </p>
      )}
    </div>
  );
}
