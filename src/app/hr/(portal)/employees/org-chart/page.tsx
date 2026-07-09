import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui";
import { Avatar } from "@/components/hr/avatar";

export const dynamic = "force-dynamic";

interface Node {
  id: string;
  first_name: string;
  last_name: string;
  position_title: string | null;
  photo_path: string | null;
  manager_id: string | null;
}

function Tree({ nodes, byManager, depth }: { nodes: Node[]; byManager: Map<string | null, Node[]>; depth: number }) {
  return (
    <ul className={depth > 0 ? "ml-6 border-l border-stone-200 pl-4" : ""}>
      {nodes.map((n) => {
        const reports = byManager.get(n.id) ?? [];
        return (
          <li key={n.id} className="mt-2">
            <Link href={`/hr/employees/${n.id}`}
              className="inline-flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-stone-100">
              <Avatar photoPath={n.photo_path} name={`${n.first_name} ${n.last_name}`} size={28} />
              <span className="text-sm font-medium text-stone-800">{n.first_name} {n.last_name}</span>
              {n.position_title && <span className="text-xs text-stone-400">· {n.position_title}</span>}
            </Link>
            {reports.length > 0 && <Tree nodes={reports} byManager={byManager} depth={depth + 1} />}
          </li>
        );
      })}
    </ul>
  );
}

export default async function OrgChartPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("employees")
    .select("id, first_name, last_name, position_title, photo_path, manager_id")
    .neq("status", "resigned")
    .neq("status", "terminated")
    .order("first_name");

  const employees = (data as Node[] | null) ?? [];
  const ids = new Set(employees.map((e) => e.id));
  const byManager = new Map<string | null, Node[]>();
  for (const e of employees) {
    // ถ้า manager ไม่อยู่ในชุด (เช่น ลาออก) ให้ถือเป็น root
    const key = e.manager_id && ids.has(e.manager_id) ? e.manager_id : null;
    if (!byManager.has(key)) byManager.set(key, []);
    byManager.get(key)!.push(e);
  }
  const roots = byManager.get(null) ?? [];

  return (
    <div>
      <Link href="/hr/employees" className="text-sm text-stone-500 hover:text-emerald-700">
        ← ทำเนียบพนักงาน
      </Link>
      <h1 className="mb-6 mt-1 text-2xl font-bold text-stone-900">ผังองค์กร</h1>
      <Card>
        {roots.length > 0 ? (
          <Tree nodes={roots} byManager={byManager} depth={0} />
        ) : (
          <p className="py-8 text-center text-stone-400">
            ยังไม่มีข้อมูลพนักงาน หรือยังไม่ได้กำหนดสายบังคับบัญชา
          </p>
        )}
      </Card>
    </div>
  );
}
