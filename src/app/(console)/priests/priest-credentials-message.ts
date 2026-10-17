export const PRIEST_APP_URL = "https://bookingg.purohithconnect.com";
export const PENDING_CREDENTIALS_KEY = "purohith:new-priest-credentials";

export type PriestCredentials = { username: string; email: string; password: string };

export function priestCredentialsMessage({ username, email, password }: PriestCredentials) {
  return [
    "Your Purohith Connect priest login",
    "",
    `Username: ${username}`,
    ...(email ? [`Email (can be used instead of username): ${email}`] : []),
    `Password: ${password}`,
    "",
    "How to sign in:",
    `1. Open ${PRIEST_APP_URL}`,
    "2. Choose \"I am a priest\"",
    "3. Tap \"Username & password\", enter the details above and sign in",
  ].join("\n");
}
