"use client";

import { useState } from "react";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
function generatePassword() {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  return `${Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]).join("")}7a`;
}

export function NewPasswordFields() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [visible, setVisible] = useState(false);
  return <><label>New password<input name="password" type={visible ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} minLength={12} maxLength={72} autoComplete="new-password" required/></label><button type="button" className="secondary-button" onClick={() => { const next = generatePassword(); setPassword(next); setConfirm(next); setVisible(true); }}>Generate strong password</button><label>Confirm password<input name="confirm_password" type={visible ? "text" : "password"} value={confirm} onChange={(event) => setConfirm(event.target.value)} minLength={12} maxLength={72} autoComplete="new-password" required/></label><label style={{ display: "flex", alignItems: "center", gap: 8 }}><input type="checkbox" checked={visible} onChange={(event) => setVisible(event.target.checked)}/> Show password</label><small>Save or copy a generated password before leaving this page.</small></>;
}
