"use client";

import { useActionState, useEffect, useState } from "react";
import { Check, Copy, Eye, EyeOff, KeyRound, RefreshCw } from "lucide-react";
import { resetPriestPassword } from "@/app/actions/content";
import styles from "./priest-password-reset.module.css";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

function generatePassword() {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  const part = (start: number, length: number) => Array.from(bytes.slice(start, start + length), (byte) => ALPHABET[byte % ALPHABET.length]).join("");
  return `${part(0, 6)}-${part(6, 6)}-${part(12, 6)}7a`;
}

export function PriestPasswordReset({ priestId }: { priestId: string }) {
  const [state, formAction, pending] = useActionState(resetPriestPassword, { ok: false, error: "", nonce: "" });
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [nonce, setNonce] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (state.ok && state.nonce === nonce) setVisible(true);
  }, [state.ok, state.nonce, nonce]);

  function regenerate() {
    setPassword(generatePassword());
    setVisible(true);
    setNonce(crypto.randomUUID());
    setCopied(false);
  }

  async function copyPassword() {
    await navigator.clipboard.writeText(password);
    setCopied(true);
  }

  return <div className={styles.box}>
    <div className={styles.heading}><KeyRound size={17}/><div><strong>Priest login password</strong><small>Existing passwords cannot be viewed. Enter your own or generate a new one, then apply it to this priest&apos;s account.</small></div></div>
    <form action={formAction} className={styles.form}>
      <input type="hidden" name="priest_profile_id" value={priestId}/>
      <input type="hidden" name="nonce" value={nonce}/>
      <label>New password (12–72 characters)
        <span className={styles.inputRow}>
          <input name="password" type={visible ? "text" : "password"} value={password} onChange={(event) => { setPassword(event.target.value); setNonce(crypto.randomUUID()); setCopied(false); }} minLength={12} maxLength={72} autoComplete="new-password" spellCheck={false} placeholder="Generate or enter a new password" required disabled={pending}/>
          <button type="button" onClick={() => setVisible((value) => !value)} aria-label={visible ? "Hide new password" : "Show new password"} title={visible ? "Hide new password" : "Show new password"}>{visible ? <EyeOff size={15}/> : <Eye size={15}/>}<span>{visible ? "Hide" : "Show"}</span></button>
          <button type="button" onClick={regenerate} aria-label="Generate new password" title="Generate new password" disabled={pending}><RefreshCw size={15}/><span>Generate</span></button>
        </span>
      </label>
      <div className={styles.actions}>
        <button className="primary-button" type="submit" disabled={pending || password.length < 12}>{pending ? "Applying..." : "Apply new password"}</button>
        {state.ok && state.nonce === nonce && <button className="secondary-button" type="button" onClick={copyPassword}><Copy size={14}/>{copied ? "Copied" : "Copy password"}</button>}
      </div>
    </form>
    {state.error && state.nonce === nonce && <p role="alert" className={styles.error}>{state.error}</p>}
    {state.ok && state.nonce === nonce && <p role="status" className={styles.success}><Check size={14}/>Password changed. The new password is visible above. Copy it now and share it securely; it cannot be retrieved after this page closes.</p>}
  </div>;
}
