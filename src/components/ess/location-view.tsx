"use client";

import { useState } from "react";

function osmEmbed(lat: number, lng: number): string {
  const d = 0.004;
  const bbox = [lng - d, lat - d, lng + d, lat + d].join("%2C");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`;
}

/** ปุ่ม "ดูแผนที่" ที่กางแผนที่ OSM (ไม่ต้องใช้ API key) แสดงพิกัด check-in/out */
export function LocationView({
  lat,
  lng,
  label = "ดูแผนที่",
}: {
  lat: number | null;
  lng: number | null;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  if (lat == null || lng == null) return <span className="text-xs text-stone-400">ไม่มีพิกัด</span>;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xs font-medium text-emerald-700 hover:underline"
      >
        📍 {open ? "ซ่อนแผนที่" : label}
      </button>
      {open && (
        <div className="mt-2">
          <iframe
            src={osmEmbed(lat, lng)}
            className="h-56 w-full rounded-lg border border-stone-200"
            loading="lazy"
            title="ตำแหน่งลงเวลา"
          />
          <div className="mt-1 flex items-center justify-between text-xs text-stone-400">
            <span>พิกัด: {lat.toFixed(6)}, {lng.toFixed(6)}</span>
            <a
              href={`https://www.google.com/maps?q=${lat},${lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-700 hover:underline"
            >
              เปิดใน Google Maps ↗
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
