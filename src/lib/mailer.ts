/**
 * mailer.ts — Nodemailer tabanlı e-posta gönderimi.
 * SMTP ayarları Vercel env'den okunur. Ayar yoksa sessizce atlanır.
 *
 * Gerekli env key'leri:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
 *   SMTP_FROM  (opsiyonel, default: SMTP_USER)
 */

import nodemailer from "nodemailer";

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user, pass },
  });
}

export interface MailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendMail(opts: MailOptions): Promise<{ ok: boolean; error?: string }> {
  try {
    const transporter = getTransporter();
    if (!transporter) {
      console.warn("[mailer] SMTP ayarları eksik, e-posta atlandı.");
      return { ok: false, error: "SMTP ayarları eksik" };
    }

    const from =
      process.env.SMTP_FROM ??
      `"XipSoft" <${process.env.SMTP_USER}>`;

    await transporter.sendMail({ from, ...opts });
    return { ok: true };
  } catch (err) {
    console.error("[mailer] Gönderim hatası:", err instanceof Error ? err.message : err);
    return { ok: false, error: err instanceof Error ? err.message : "Bilinmeyen hata" };
  }
}

/** Teklif hazır bildirimi — müşteriye gönderilir. */
export function buildTeklifReadyEmail(opts: {
  name: string;
  service: string;
  amount: string;
  teklifUrl: string;
}): MailOptions {
  return {
    to: "", // çağıran tarafından doldurulur
    subject: `✅ Teklifiniz Hazır — ${opts.service} | XipSoft`,
    html: `
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Teklifiniz Hazır</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#111118;border-radius:16px;border:1px solid #1f1f2e;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#7c3aed22,#0ea5e922);padding:32px 40px;text-align:center;border-bottom:1px solid #1f1f2e;">
              <h1 style="margin:0;font-size:24px;font-weight:900;color:#fff;">
                ✅ Teklifiniz Hazır
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 40px;">
              <p style="margin:0 0 16px;color:#a1a1aa;font-size:15px;line-height:1.6;">
                Merhaba <strong style="color:#fff;">${opts.name}</strong>,
              </p>
              <p style="margin:0 0 24px;color:#a1a1aa;font-size:15px;line-height:1.6;">
                <strong style="color:#fff;">${opts.service}</strong> hizmetiniz için
                hazırladığımız teklifimizi aşağıdaki butona tıklayarak görüntüleyebilirsiniz.
              </p>

              <!-- Tutar kutusu -->
              <div style="background:#0f0f1a;border:1px solid #2a2a3e;border-radius:12px;padding:20px;text-align:center;margin-bottom:28px;">
                <p style="margin:0 0 4px;color:#71717a;font-size:12px;text-transform:uppercase;letter-spacing:.1em;">Teklif Tutarı</p>
                <p style="margin:0;font-size:28px;font-weight:900;color:#fff;">${opts.amount}</p>
              </div>

              <!-- CTA butonu -->
              <div style="text-align:center;margin-bottom:28px;">
                <a href="${opts.teklifUrl}"
                   style="display:inline-block;background:linear-gradient(135deg,#22d3ee,#7c3aed);color:#000;font-weight:700;font-size:15px;padding:14px 36px;border-radius:12px;text-decoration:none;">
                  Teklifi Görüntüle &amp; Onayla →
                </a>
              </div>

              <p style="margin:0;color:#52525b;font-size:13px;line-height:1.6;text-align:center;">
                Sorunuz varsa bize
                <a href="https://wa.me/905444548444" style="color:#22d3ee;">WhatsApp</a>
                veya
                <a href="mailto:info@xipsoft.net" style="color:#22d3ee;">info@xipsoft.net</a>
                üzerinden ulaşabilirsiniz.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #1f1f2e;text-align:center;">
              <p style="margin:0;color:#3f3f46;font-size:12px;">
                XipSoft Yazılım ve Teknoloji Sistemleri · xipsoft.net
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
  };
}
