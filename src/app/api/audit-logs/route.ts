import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { mockDb } from "@/lib/mock-store";

const isRealSupabase =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder") &&
  process.env.SUPABASE_SERVICE_ROLE_KEY &&
  !process.env.SUPABASE_SERVICE_ROLE_KEY.includes("placeholder");

export async function GET(req: NextRequest) {
  const caseId = req.nextUrl.searchParams.get("caseId");

  if (!caseId) {
    return NextResponse.json({ logs: [] });
  }

  try {
    if (isRealSupabase) {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .eq("case_id", caseId)
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        return NextResponse.json({ logs: data });
      }
    }

    const filteredLogs = mockDb.audit_logs.filter((l) => l.case_id === caseId);
    return NextResponse.json({ logs: filteredLogs });
  } catch (error) {
    const filteredLogs = mockDb.audit_logs.filter((l) => l.case_id === caseId);
    return NextResponse.json({ logs: filteredLogs });
  }
}
