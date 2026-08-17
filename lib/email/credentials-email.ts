/**
 * Credentials email — safe, optional, dependency-free.
 *
 * Sends the ONE-TIME temporary password to a newly created company account
 * via the Resend REST API (plain fetch — no package required). The account
 * is ALWAYS immediately usable from the temporary password shown in the
 * UI; this email is a convenience delivery channel only and is never the
 * source of truth.
 *
 * Required configuration (documented, never invented):
 *   RESEND_API_KEY=<api key>
 *   RESEND_FROM_EMAIL="SBBT Software <no-reply@sbbt.in>"   (optional override)
 *
 * When RESEND_API_KEY is absent the call is a safe no-op
 * ({ sent: false, reason: "EMAIL_NOT_CONFIGURED" }) — credentials are still
 * displayed once in the UI, so account creation never depends on email.
 *
 * SECURITY:
 *  - NEVER sends a permanent password (we never know it).
 *  - Sends only the temporary password, which is invalidated as soon as
 *    the user sets their own password.
 *  - No secrets in source code; the key is read from the environment and
 *    never logged.
 */

export type CredentialsEmailResult =
  | { sent: true }
  | { sent: false; reason: "EMAIL_NOT_CONFIGURED" | "EMAIL_FAILED" };

type CredentialsEmailInput = {
  to: string;
  companyName: string;
  roleLabel: string;
  username: string;
  temporaryPassword: string;
  loginUrl: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendAccountCredentialsEmail(
  input: CredentialsEmailInput,
): Promise<CredentialsEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return { sent: false, reason: "EMAIL_NOT_CONFIGURED" };
  }

  const from =
    process.env.RESEND_FROM_EMAIL?.trim() || "SBBT Software <no-reply@sbbt.in>";
  const {
    to,
    companyName,
    roleLabel,
    username,
    temporaryPassword,
    loginUrl,
  } = input;

  const html = `
<!doctype html>
<html>
<body style="margin:0;padding:0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#f4f4f5;color:#18181b;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;border:1px solid #e4e4e7;overflow:hidden;">
        <tr><td style="padding:24px 28px;background:#4f46e5;">
          <span style="color:#ffffff;font-size:18px;font-weight:700;">SBBT Software</span>
        </td></tr>
        <tr><td style="padding:28px;">
          <h1 style="margin:0 0 8px;font-size:20px;color:#18181b;">Your SBBT account is ready</h1>
          <p style="margin:0 0 20px;color:#52525b;font-size:14px;line-height:1.5;">
            Your SBBT Software account has been created. Sign in with the
            temporary password below and set your own password on first login.
          </p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;border:1px solid #e4e4e7;border-radius:8px;margin-bottom:20px;">
            <tr><td style="padding:14px 18px;font-size:14px;">
              <span style="color:#71717a;font-size:12px;">COMPANY</span><br/>
              <span style="color:#18181b;font-weight:600;">${escapeHtml(companyName)}</span>
            </td></tr>
            <tr><td style="padding:0 18px 14px;font-size:14px;">
              <span style="color:#71717a;font-size:12px;">ROLE</span><br/>
              <span style="color:#18181b;font-weight:600;">${escapeHtml(roleLabel)}</span>
            </td></tr>
            <tr><td style="padding:0 18px 14px;font-size:14px;">
              <span style="color:#71717a;font-size:12px;">USER ID</span><br/>
              <span style="color:#18181b;font-weight:600;">${escapeHtml(username)}</span>
            </td></tr>
            <tr><td style="padding:0 18px 14px;font-size:14px;">
              <span style="color:#71717a;font-size:12px;">TEMPORARY PASSWORD</span><br/>
              <span style="color:#18181b;font-weight:600;font-family:ui-monospace,Menlo,Consolas,monospace;">${escapeHtml(temporaryPassword)}</span>
            </td></tr>
          </table>
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr><td style="border-radius:8px;background:#4f46e5;padding:12px 24px;">
              <a href="${escapeHtml(loginUrl)}" style="color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;">Sign in to SBBT</a>
            </td></tr>
          </table>
          <p style="margin:20px 0 0;color:#71717a;font-size:12px;line-height:1.5;">
            Please log in using the temporary password and create your personal
            password. The temporary password will stop working once you do.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: "Your SBBT account is ready",
        html,
      }),
    });

    if (!response.ok) {
      return { sent: false, reason: "EMAIL_FAILED" };
    }
    return { sent: true };
  } catch {
    return { sent: false, reason: "EMAIL_FAILED" };
  }
}
