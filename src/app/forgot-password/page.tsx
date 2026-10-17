import Link from "next/link";
import { KeyRound } from "lucide-react";
import { requestPasswordReset } from "@/app/actions/auth";

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string; sent?: string }> }) {
  const query = await searchParams;
  return <main className="login-page"><section className="login-story"><div className="login-brand"><strong>Purohith Connect</strong></div><div><p className="eyebrow light">Admin account recovery</p><h1>Get back to the console.</h1><p>We will send a secure link to the email address on your administrator account.</p></div></section><section className="login-panel"><div className="login-form"><div className="login-lock"><KeyRound size={20}/></div><h2>Reset your password</h2><p className="muted">Enter your administrator email. If an account exists, you will receive a reset link.</p>{query.sent && <div className="notice success">If the account exists, a reset link has been sent. Check your inbox.</div>}{query.error && <div className="notice error">{query.error}</div>}<form action={requestPasswordReset} className="stack-form"><label>Email<input name="email" type="email" autoComplete="email" required placeholder="admin@purohithconnect.com"/></label><button className="primary-button full" type="submit">Send reset link</button></form><Link href="/login">Back to sign in</Link></div></section></main>;
}
