"use client";

import { useActionState, useState } from "react";
import { Check, Copy, Eye, EyeOff, RefreshCw } from "lucide-react";
import { resetAccountPassword } from "@/app/actions/content";
import styles from "../priests/priest-password-reset.module.css";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
function generatePassword() {
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  const chars = Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]).join("");
  return `${chars.slice(0, 6)}-${chars.slice(6, 12)}-${chars.slice(12)}7a`;
}

export function AccountPasswordReset({ userId }: { userId: string }) {
  const [state, action, pending] = useActionState(resetAccountPassword, { ok: false, error: "", nonce: "" });
  const [password, setPassword] = useState("");
  const [nonce, setNonce] = useState("");
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  return <div className={styles.box}>
    <div className={styles.heading}><strong>Reset account password</strong></div>
    <form action={action} className={styles.form}>
      <input name="user_id" type="hidden" value={userId}/><input name="nonce" type="hidden" value={nonce}/>
      <label>New password <span className={styles.inputRow}>
        <input name="password" type={visible ? "text" : "password"} minLength={12} maxLength={72} autoComplete="new-password" value={password} disabled={pending} onChange={(event) => { setPassword(event.target.value); setNonce(crypto.randomUUID()); setCopied(false); }} required/>
        <button type="button" title={visible ? "Hide password" : "Show password"} aria-label={visible ? "Hide password" : "Show password"} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={15}/> : <Eye size={15}/>}</button>
        <button type="button" title="Generate new password" aria-label="Generate new password" disabled={pending} onClick={() => { setPassword(generatePassword()); setNonce(crypto.randomUUID()); setVisible(true); setCopied(false); }}><RefreshCw size={15}/></button>
      </span></label>
      <div className={styles.actions}><button className="primary-button" disabled={pending || password.length < 12}>{pending ? "Applying..." : "Apply new password"}</button>
        {state.ok && state.nonce === nonce && <button className="secondary-button" type="button" onClick={async () => { await navigator.clipboard.writeText(password); setCopied(true); }}><Copy size={14}/>{copied ? "Copied" : "Copy password"}</button>}
      </div>
    </form>
    {state.error && state.nonce === nonce && <p role="alert" className={styles.error}>{state.error}</p>}
    {state.ok && state.nonce === nonce && <p role="status" className={styles.success}><Check size={14}/>Changed. Copy and share securely; it will not be displayed again after this page closes.</p>}
  </div>;
}
