"use server";

import { cookies } from "next/headers";
import { verifySessionCookie } from "@/lib/security";
import pool from "@/lib/db/pool";
import sharp from "sharp";
import { IMgBB_API_KEY } from "@/config/brand.config";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
const MAGIC_BYTES: Record<string, number[][]> = {
  "image/jpeg": [[0xff, 0xd8, 0xff]],
  "image/png": [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  "image/gif": [
    [0x47, 0x49, 0x46, 0x38, 0x37, 0x61],
    [0x47, 0x49, 0x46, 0x38, 0x39, 0x61],
  ],
  "image/webp": [[0x52, 0x49, 0x46, 0x46]],
  "image/svg+xml": [],
};

function validateMagicBytes(buffer: Buffer, mimeType: string): boolean {
  const signatures = MAGIC_BYTES[mimeType];
  if (signatures === undefined) return false;
  if (mimeType === "image/svg+xml") return validateSvg(buffer);

  if (mimeType === "image/webp") {
    if (buffer.length < 12) return false;
    const isRiff = buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46;
    const isWebp = buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50;
    return isRiff && isWebp;
  }

  return signatures.some((signature) =>
    buffer.length >= signature.length && signature.every((byte, index) => buffer[index] === byte),
  );
}

function validateSvg(buffer: Buffer): boolean {
  const content = buffer.toString("utf-8").toLowerCase();
  if (!content.includes("<svg")) return false;

  const dangerous = [
    "<script", "javascript:", "vbscript:", "data:text/html", "data:application",
    "onload=", "onerror=", "onclick=", "onmouseover=", "onmouseout=", "onfocus=",
    "onblur=", "onkeydown=", "onkeyup=", "onkeypress=", "onsubmit=", "onchange=",
    "oninput=", "ondblclick=", "oncontextmenu=", "onwheel=", "ondrag=", "eval(",
    "expression(", "url(javascript", "url(data:text", "<foreignobject", "<use href",
    "<use xlink:href", "xlink:href=",
  ];

  return !dangerous.some((pattern) => content.includes(pattern));
}

/**
 * ImgBB'ye resim yükle — ücretsiz, sınırsız
 * Docs: https://api.imgbb.com/
 */
async function uploadToImgBB(buffer: Buffer, name: string): Promise<string> {
  if (!IMgBB_API_KEY) {
    throw new Error("IMgBB_API_KEY env degiskeni tanımlı degil.");
  }

  const base64 = buffer.toString("base64");

  const formData = new FormData();
  formData.append("key", IMgBB_API_KEY);
  formData.append("image", base64);
  formData.append("name", name);

  const response = await fetch("https://api.imgbb.com/1/upload", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ImgBB upload basarısız: ${error}`);
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(`ImgBB hata: ${data.error?.message || "Bilinmeyen hata"}`);
  }

  // display_url: direkt görüntülenebilir URL
  return data.data.display_url as string;
}

/**
 * Avatar veya Cover yükleme (Server Action)
 */
export async function uploadAvatarAction(
  formData: FormData
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    // Auth kontrolü
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("xipsoft_session")?.value;
    if (!sessionToken) {
      return { success: false, error: "Oturum açmanız gerekiyor" };
    }

    const payload = await verifySessionCookie(sessionToken);
    if (!payload?.userId) {
      return { success: false, error: "geçersiz oturum" };
    }

    const file = formData.get("file") as File | null;
    const type = (formData.get("type") as string) || "avatar"; // "avatar" | "cover"

    if (!file) {
      return { success: false, error: "Dosya bulunamadı" };
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return { success: false, error: "Sadece JPG, PNG, WebP, AVIF veya GIF yükleyebilirsiniz" };
    }

    if (file.size > MAX_SIZE) {
      return { success: false, error: "Dosya boyutu 5MB'dan büyük olamaz" };
    }

    const rawBuffer = Buffer.from(await file.arrayBuffer());

    // ── Magic Bytes dogrulaması ───────────────────────────────────────────────
    // Content-Type header'ı sahte olabilir (ör: malicious.php → "image/jpeg" olarak gönderilir).
    // Dosyanın gerçek formatını binary imzasından dogrula.
    if (!validateMagicBytes(rawBuffer, file.type)) {
      return { success: false, error: "Dosya içerigi, belirtilen türle eslesmiyor. Yükleme reddedildi." };
    }

    // AVIF → WebP fallback ile boyutlandır (GIF hariç)
    // AVIF ~%20-30 daha kücük, kalite daha iyi
    let buffer: Buffer;
    if (file.type === "image/gif") {
      buffer = rawBuffer;
    } else {
      const size = type === "cover"
        ? { width: 1200, height: 400 }
        : { width: 256, height: 256 };
      const resized = sharp(rawBuffer)
        .resize(size.width, size.height, { fit: "cover", position: "center" });

      // Once AVIF dene, hata olursa WebP fallback
      try {
        buffer = await resized.avif({ quality: 70, effort: 6, chromaSubsampling: '4:2:0' }).clone().toBuffer();
      } catch {
        buffer = await resized.webp({ quality: 85 }).toBuffer();
      }
    }

    const name = `xipsoft_${type}_user${payload.userId}_${Date.now()}`;

    // ImgBB'ye yükle
    const url = await uploadToImgBB(buffer, name);

    if (!url) {
      return { success: false, error: "Yükleme basarısız" };
    }

    // DB'ye kaydet
    const column = type === "cover" ? "cover_url" : "photo_url";
    await pool.query(
      `UPDATE users SET ${column} = $1, updated_at = NOW() WHERE id = $2`,
      [url, payload.userId]
    );

    return { success: true, url };
  } catch (err: any) {
    return { success: false, error: err.message || "Sunucu hatası" };
  }
}
