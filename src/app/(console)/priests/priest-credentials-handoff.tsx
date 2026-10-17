"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Check, Copy, KeyRound } from "lucide-react";
import styles from "./priest-credentials-fields.module.css";
import { PENDING_CREDENTIALS_KEY, PRIEST_APP_URL, priestCredentialsMessage, type PriestCredentials } from "./priest-credentials-message";

const subscribe = () => () => {};

function parse(raw: string | null, success?: string): PriestCredentials | null {
  if (!raw || !success) return null;
  try {
    const saved = JSON.parse(raw) as PriestCredentials;
    return saved.username && success.includes(`username ${saved.username}`) ? saved : null;
  } catch {
    return null;
  }
}

export function PriestCredentialsHandoff({ success }: { success?: string }) {
  const raw = useSyncExternalStore(subscribe, () => sessionStorage.getItem(PENDING_CREDENTIALS_KEY), () => null);
  const saved = useMemo(() => parse(raw, success), [raw, success]);
  const [dismissed, setDismissed] = useState(false);
  const [copied, setCopied] = useState(false);
  const credentials = dismissed ? null : saved;

  useEffect(() => {
    if (raw && !saved) sessionStorage.removeItem(PENDING_CREDENTIALS_KEY);
  }, [raw, saved]);

  if (!credentials) return null;

  async function copy() {
    if (!credentials) return;
    await navigator.clipboard.writeText(priestCredentialsMessage(credentials));
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  function dismiss() {
    sessionStorage.removeItem(PENDING_CREDENTIALS_KEY);
    setDismissed(true);
  }

  return <section className={`panel ${styles.card}`}>
    <div className={styles.header}>
      <div className={styles.heading}><KeyRound size={18}/><div><strong>Account created. Send these login details to the priest</strong><small>This is the only time the password is shown. Copy it now.</small></div></div>
    </div>
    <div className={styles.grid}>
      <label>Username<span className={styles.inputRow}><input readOnly value={credentials.username}/></span></label>
      <label>Password<span className={styles.inputRow}><input readOnly value={credentials.password}/></span></label>
      {credentials.email && <label className={styles.full}>Email (also works as the login)<input readOnly value={credentials.email}/></label>}
    </div>
    <div className={styles.howTo}>
      <strong>How the priest signs in</strong>
      <span>Open <a href={PRIEST_APP_URL} target="_blank" rel="noreferrer">{PRIEST_APP_URL.replace("https://", "")}</a>, choose <b>I am a priest</b>, tap <b>Username &amp; password</b>, then enter the details above.</span>
    </div>
    <div className={styles.actions}>
      <button type="button" className="primary-button" onClick={copy}>{copied ? <Check size={15}/> : <Copy size={15}/>}{copied ? "Copied" : "Copy login message"}</button>
      <button type="button" className="secondary-button" onClick={dismiss}>Done, I&apos;ve shared it</button>
    </div>
  </section>;
}
