import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL ?? "no-reply@feedbackloop.app";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function base(title: string, body: string) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${title}</title>
<style>
  body{margin:0;padding:0;background:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Georgia,serif;color:#1c1917}
  .wrap{max-width:520px;margin:40px auto;background:#fff;border:1px solid #e7e5e4;overflow:hidden}
  .header{background:#1c1917;padding:32px 36px;text-align:left}
  .header-brand{font-size:11px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,.45);margin:0 0 8px}
  .header h1{margin:0;color:#fff;font-size:20px;font-weight:700;line-height:1.3}
  .body{padding:32px 36px}
  .body p{margin:0 0 16px;font-size:15px;line-height:1.65;color:#44403c}
  .btn{display:inline-block;margin:8px 0 24px;padding:14px 28px;background:#c2410c;color:#fff;text-decoration:none;font-size:15px;font-weight:600}
  .link-box{background:#fafaf9;border:1px solid #e7e5e4;padding:12px 16px;font-size:13px;color:#78716c;word-break:break-all;margin-bottom:24px;font-family:monospace}
  .footer{padding:20px 36px;border-top:1px solid #f5f5f4;font-size:12px;color:#a8a29e;text-align:left}
</style></head><body>
<div class="wrap">
  <div class="header"><p class="header-brand">FeedbackLoop</p><h1>${title}</h1></div>
  <div class="body">${body}</div>
  <div class="footer">FeedbackLoop &middot; You received this because you were added as an attendee.<br/>If this was a mistake, ignore this email &mdash; no action needed.</div>
</div>
</body></html>`;
}

export async function sendFeedbackInvite({
  to,
  name,
  sessionTitle,
  token,
}: {
  to: string;
  name: string;
  sessionTitle: string;
  token: string;
}) {
  const link = `${APP_URL}/session/${token}`;
  const html = base(
    "You're invited to share feedback",
    `<p>Hi <strong>${name}</strong>,</p>
     <p>You've been invited to share feedback on <strong>${sessionTitle}</strong>.</p>
     <p>It only takes a couple of minutes — record a short video or leave a quick emoji reaction.</p>
     <a class="btn" href="${link}">Share My Feedback &rarr;</a>
     <p style="font-size:13px;color:#78716c">Or copy this link into your browser:</p>
     <div class="link-box">${link}</div>
     <p>Thank you for being part of the session!</p>`
  );

  return resend.emails.send({
    from: FROM,
    to,
    subject: `Your feedback is needed — ${sessionTitle}`,
    html,
  });
}

export async function sendReminderEmail({
  to,
  name,
  sessionTitle,
  token,
}: {
  to: string;
  name: string;
  sessionTitle: string;
  token: string;
}) {
  const link = `${APP_URL}/session/${token}`;
  const html = base(
    "Friendly reminder",
    `<p>Hi <strong>${name}</strong>,</p>
     <p>Just a quick nudge &mdash; we haven't received your feedback for <strong>${sessionTitle}</strong> yet.</p>
     <p>It only takes a minute and means a lot to the speaker. Your unique link is still active:</p>
     <a class="btn" href="${link}">Share My Feedback &rarr;</a>
     <div class="link-box">${link}</div>`
  );

  return resend.emails.send({
    from: FROM,
    to,
    subject: `Reminder: share your feedback on ${sessionTitle}`,
    html,
  });
}

export async function sendThankYouEmail({
  to,
  name,
  sessionTitle,
}: {
  to: string;
  name: string;
  sessionTitle: string;
}) {
  const html = base(
    "Thank you!",
    `<p>Hi <strong>${name}</strong>,</p>
     <p>Thank you for taking the time to share your feedback on <strong>${sessionTitle}</strong>.</p>
     <p>Your response has been recorded and the speaker will review it soon.</p>
     <p>We appreciate you! 🙌</p>`
  );

  return resend.emails.send({
    from: FROM,
    to,
    subject: `Thanks for your feedback on ${sessionTitle}`,
    html,
  });
}
