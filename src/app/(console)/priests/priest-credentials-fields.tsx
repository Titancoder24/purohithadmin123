"use client";

import { useState } from "react";
import { Copy, KeyRound, RefreshCw } from "lucide-react";
import styles from "./priest-credentials-fields.module.css";

function randomPart(length: number) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

function username() {
  return `purohit-${randomPart(6).replace(/[^a-zA-Z0-9]/g, "7").toLowerCase()}`;
}

export function PriestCredentialsFields() {
  const [email, setEmail] = useState("");
  const [loginUsername, setLoginUsername] = useState(username);
  const [password, setPassword] = useState(() => `${randomPart(7)}aA7!${randomPart(5)}`);
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(`Purohith Connect priest login\nUsername: ${loginUsername}\n${email ? `Email: ${email}\n` : ""}Temporary password: ${password}\nSign in: https://prohit-connect-one.vercel.app`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return <div className={`span-2 ${styles.card}`}>
    <div className={styles.heading}><KeyRound size={18}/><div><strong>Priest login credentials</strong><small>The priest can sign in with this username, or with the email when supplied.</small></div></div>
    <div className={styles.grid}>
      <label>Email address (optional)<input name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="purohit@example.com" autoComplete="off"/></label>
      <label>Login username<input name="login_username" value={loginUsername} onChange={(event) => setLoginUsername(event.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ""))} minLength={3} maxLength={32} pattern="[a-z0-9._-]{3,32}" required autoComplete="off"/></label>
      <label className={styles.password}>Temporary password<input name="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={12} maxLength={72} required autoComplete="new-password"/></label>
    </div>
    <div className={styles.actions}><button type="button" className="secondary-button" onClick={() => setPassword(`${randomPart(7)}aA7!${randomPart(5)}`)}><RefreshCw size={15}/>Generate password</button><button type="button" className="secondary-button" onClick={copy}><Copy size={15}/>{copied ? "Copied" : "Copy credentials"}</button></div>
    <p>Copy the credentials before submitting. Passwords are hashed by Supabase Auth and cannot be viewed again.</p>
  </div>;
}
