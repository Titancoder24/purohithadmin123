"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, Eye, EyeOff, KeyRound, RefreshCw } from "lucide-react";
import styles from "./priest-credentials-fields.module.css";
import { PENDING_CREDENTIALS_KEY, PRIEST_APP_URL, priestCredentialsMessage } from "./priest-credentials-message";

const LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

function randomPart(length: number, alphabet = LETTERS) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

const newUsername = () => `purohit-${randomPart(6, "abcdefghijkmnpqrstuvwxyz23456789")}`;
const newPassword = () => `${randomPart(5)}-${randomPart(5)}-${randomPart(4)}7a`;

export function PriestCredentialsFields() {
  const cardRef = useRef<HTMLDivElement>(null);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState(newUsername);
  const [password, setPassword] = useState(newPassword);
  const [showPassword, setShowPassword] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const form = cardRef.current?.closest("form");
    if (!form) return;
    const remember = () => sessionStorage.setItem(PENDING_CREDENTIALS_KEY, JSON.stringify({ username, email: email.trim().toLowerCase(), password }));
    form.addEventListener("submit", remember);
    return () => form.removeEventListener("submit", remember);
  }, [username, email, password]);

  async function copy() {
    await navigator.clipboard.writeText(priestCredentialsMessage({ username, email: email.trim().toLowerCase(), password }));
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return <div ref={cardRef} className={`span-2 ${styles.card}`}>
    <div className={styles.header}>
      <div className={styles.heading}><KeyRound size={18}/><div><strong>Priest login credentials</strong><small>The priest signs in to the app with these. We have suggested a username and password; you can edit either one.</small></div></div>
      <span className={styles.draftBadge}>Not created yet</span>
    </div>

    <ol className={styles.steps}>
      <li>Check the username and password below.</li>
      <li>Fill in the rest of the form and click <strong>Create Purohit account</strong> at the bottom.</li>
      <li>After it is created, these details are shown again with a <strong>Copy login message</strong> button to send to the priest.</li>
    </ol>

    <div className={styles.grid}>
      <label>
        Login username
        <span className={styles.inputRow}>
          <input name="login_username" value={username} onChange={(event) => setUsername(event.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ""))} minLength={3} maxLength={32} pattern="[a-z0-9._-]{3,32}" required autoComplete="off" spellCheck={false}/>
          <button type="button" className={styles.iconButton} onClick={() => setUsername(newUsername())} title="Suggest another username" aria-label="Suggest another username"><RefreshCw size={15}/></button>
        </span>
        <small>3 to 32 lowercase letters, numbers, dots, dashes or underscores.</small>
      </label>
      <label>
        Password
        <span className={styles.inputRow}>
          <input name="password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} minLength={12} maxLength={72} required autoComplete="new-password" spellCheck={false}/>
          <button type="button" className={styles.iconButton} onClick={() => setShowPassword((value) => !value)} title={showPassword ? "Hide password" : "Show password"} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={15}/> : <Eye size={15}/>}</button>
          <button type="button" className={styles.iconButton} onClick={() => { setPassword(newPassword()); setShowPassword(true); }} title="Suggest another password" aria-label="Suggest another password"><RefreshCw size={15}/></button>
        </span>
        <small>At least 12 characters. The priest can change it later.</small>
      </label>
      <label className={styles.full}>
        Email address <em>(optional)</em>
        <input name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="purohit@example.com" autoComplete="off"/>
        <small>If you add one, the priest can also sign in with it and reset a forgotten password by email. Leave it empty if they don&apos;t use email.</small>
      </label>
    </div>

    <div className={styles.howTo}>
      <strong>How the priest signs in</strong>
      <span>Open <a href={PRIEST_APP_URL} target="_blank" rel="noreferrer">{PRIEST_APP_URL.replace("https://", "")}</a>, choose <b>I am a priest</b>, tap <b>Username &amp; password</b>, then enter the username and password above.</span>
    </div>

    <div className={styles.actions}>
      <button type="button" className="secondary-button" onClick={copy}>{copied ? <Check size={15}/> : <Copy size={15}/>}{copied ? "Copied" : "Copy login message"}</button>
      <small>Passwords are stored encrypted, so they can&apos;t be looked up after this page closes.</small>
    </div>
  </div>;
}
