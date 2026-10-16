/**
 * Cloudflare Turnstile server-side siteverify
 * Secret is read from TURNSTILE_SECRET env variable — never hard-coded.
 */
export async function verifyTurnstile(
  token: string,
  remoteip?: string
): Promise<{ success: boolean; error?: string }> {
  // Local development must not require Cloudflare credentials; deployed builds do.
  if (process.env.NODE_ENV === "development") {
    return { success: true };
  }

  const secret = process.env.TURNSTILE_SECRET ?? process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    console.error("[turnstile] TURNSTILE_SECRET env variable is not set");
    return { success: false, error: "Turnstile yapılandırma hatası" };
  }

  if (!token) {
    return { success: false, error: "Turnstile doğrulaması gereklidir" };
  }

  try {
    const body: Record<string, string> = {
      secret,
      response: token,
    };
    if (remoteip) body.remoteip = remoteip;

    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    const data = (await res.json()) as { success: boolean; "error-codes"?: string[] };

    if (!data.success) {
      console.warn("[turnstile] verification failed", data["error-codes"]);
      return { success: false, error: "Bot doğrulaması başarısız" };
    }

    return { success: true };
  } catch (err) {
    console.error("[turnstile] fetch error", err);
    return { success: false, error: "Bot doğrulaması sırasında hata oluştu" };
  }
}
