import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payment_reports")
    .select("invoice_number,invoice_html")
    .eq("id", id)
    .single();
  if (error || !data?.invoice_html) return new Response("Invoice not found", { status: 404 });
  return new Response(data.invoice_html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "content-disposition": `attachment; filename=\"${data.invoice_number || "purohith-connect-invoice"}.html\"`,
      "cache-control": "private, no-store",
    },
  });
}
