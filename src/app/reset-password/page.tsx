import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { updateAdminPassword } from "@/app/actions/auth";
import { requireAdmin } from "@/lib/auth";
import { NewPasswordFields } from "./password-fields";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireAdmin();
  if ((await cookies()).get("admin-recovery")?.value !== "1") redirect("/login?error=Reset+link+expired.+Request+a+new+one");
  const query = await searchParams;
  return <main className="login-page"><section className="login-story"><div className="login-brand"><strong>Purohith Connect</strong></div><div><p className="eyebrow light">Admin account recovery</p><h1>Choose a new password.</h1><p>Your reset link is valid for this session only.</p></div></section><section className="login-panel"><div className="login-form"><h2>New password</h2>{query.error && <div className="notice error">{query.error}</div>}<form action={updateAdminPassword} className="stack-form"><NewPasswordFields/><button className="primary-button full" type="submit">Save new password</button></form></div></section></main>;
}
