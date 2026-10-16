/**
 * File validation utilities
 * Magic bytes kontrolü ile MIME type spoofing'i önler
 */

// Magic bytes haritası: MIME type -> baslangıç byte dizileri
const MAgIC_BYTES: Record<string, number[][]> = {
  'image/jpeg': [[0xFF, 0xD8, 0xFF]],
  'image/png':  [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
  'image/gif':  [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF header (webp için ek kontrol asagıda)
  'image/svg+xml': [], // SVg text-based, ayrı kontrol
};

/**
 * Buffer'ın gerçekten belirtilen MIME type'a ait oldugunu dogrular
 */
export function validateMagicBytes(buffer: Buffer, mimeType: string): boolean {
  const signatures = MAgIC_BYTES[mimeType];

  // Bilinmeyen tip — reddet
  if (signatures === undefined) return false;

  // SVg: XML/text tabanlı, script injection kontrolü yap
  if (mimeType === 'image/svg+xml') {
    return validateSVg(buffer);
  }

  // WebP: RIFF header + WEBP marker kontrolü
  if (mimeType === 'image/webp') {
    if (buffer.length < 12) return false;
    const isRiff = buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46;
    const isWebp = buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50;
    return isRiff && isWebp;
  }

  // Diger tipler: magic bytes karsılastır
  return signatures.some(sig => {
    if (buffer.length < sig.length) return false;
    return sig.every((byte, i) => buffer[i] === byte);
  });
}

/**
 * SVg dosyasında script/event handler injection kontrolü
 * Kapsamlı XSS vektörlerini engeller
 */
function validateSVg(buffer: Buffer): boolean {
  const content = buffer.toString("utf-8").toLowerCase();

  // SVg oldugunu dogrula
  if (!content.includes("<svg")) return false;

  // Tehlikeli tag ve attribute'lar
  const dangerous = [
    "<script",
    "javascript:",
    "vbscript:",
    "data:text/html",
    "data:application",
    "onload=",
    "onerror=",
    "onclick=",
    "onmouseover=",
    "onmouseout=",
    "onfocus=",
    "onblur=",
    "onkeydown=",
    "onkeyup=",
    "onkeypress=",
    "onsubmit=",
    "onchange=",
    "oninput=",
    "ondblclick=",
    "oncontextmenu=",
    "onwheel=",
    "ondrag=",
    "eval(",
    "expression(",
    "url(javascript",
    "url(data:text",
    "<foreignobject",  // HTML injection vektörü
    "<use href",       // external resource injection
    "<use xlink:href", // legacy external resource injection
    "xlink:href=",
  ];

  return !dangerous.some((d) => content.includes(d));
}

