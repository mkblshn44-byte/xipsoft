/**
 * html-sanitize.test.ts — Stored XSS regresyon testi.
 *
 * Çalıştır:  npx tsx --test src/lib/html-sanitize.test.ts
 *
 * Kapsam: `lexical-toHtml` üç çıktı yolundan biri olan markdown/raw-string
 * yolu, daha önce hiçbir şey kaçırmıyordu. Bu testler, sanitize eklendikten
 * sonra o yolların da güvenli olduğunu sabitler.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { sanitizeRenderedHtml } from "./html-sanitize";
import { lexicalStateToHtml } from "@/utils/lexical-to-html";

// ── Tehlikeli girdiler ───────────────────────────────────────────────────────

const XSS_VECTORS: Array<{ name: string; payload: string }> = [
  { name: "script tagi", payload: "<script>alert(1)</script>" },
  { name: "img onerror", payload: '<img src=x onerror="alert(1)">' },
  { name: "svg onload", payload: "<svg/onload=alert(1)>" },
  { name: "javascript: href", payload: '<a href="javascript:alert(1)">x</a>' },
  { name: "body onload", payload: '<div onmouseover="alert(1)">x</div>' },
  { name: "iframe", payload: '<iframe src="//evil.com"></iframe>' },
  { name: "form + input", payload: '<form action="//evil.com"><input name="a"></form>' },
  { name: "style tag", payload: "<style>body{display:none}</style>" },
  { name: "inline style", payload: '<p style="background:url(javascript:alert(1))">x</p>' },
  { name: "object", payload: '<object data="//evil.com/x.swf"></object>' },
  { name: "base tag", payload: '<base href="//evil.com/">' },
  { name: "nested script", payload: "<p><script>nested</script></p>" },
];

test("tehlikeli vektörlerin HİÇBİRİ çıktıda kalmaz", () => {
  for (const { name, payload } of XSS_VECTORS) {
    const out = sanitizeRenderedHtml(payload);
    const lower = out.toLowerCase();

    assert.ok(!lower.includes("<script"), `${name}: <script sızdı → ${out}`);
    assert.ok(!lower.includes("onerror"), `${name}: onerror sızdı → ${out}`);
    assert.ok(!lower.includes("onload"), `${name}: onload sızdı → ${out}`);
    assert.ok(!lower.includes("onmouseover"), `${name}: onmouseover sızdı → ${out}`);
    assert.ok(!lower.includes("javascript:"), `${name}: javascript: sızdı → ${out}`);
    assert.ok(!lower.includes("<iframe"), `${name}: <iframe sızdı → ${out}`);
    assert.ok(!lower.includes("<object"), `${name}: <object sızdı → ${out}`);
    assert.ok(!lower.includes("<form"), `${name}: <form sızdı → ${out}`);
    assert.ok(!lower.includes("<style"), `${name}: <style sızdı → ${out}`);
    assert.ok(!lower.includes(" style="), `${name}: style özniteliği sızdı → ${out}`);
    assert.ok(!lower.includes("<base"), `${name}: <base sızdı → ${out}`);
  }
});

// ── Meşru içerik korunur ──────────────────────────────────────────────────────

test("meşru yapılar (başlık, liste, kod, tablo, bağlantı) korunur", () => {
  const html =
    '<h2 class="font-bold">Başlık</h2>' +
    '<p>Paragraf <strong>kalın</strong> <em>italik</em></p>' +
    '<ul><li>madde</li></ul>' +
    "<pre><code>const a = 1;</code></pre>" +
    '<a href="https://xipsoft.net" class="text-cyan-400">XipSoft</a>' +
    "<table><tbody><tr><td>hücre</td></tr></tbody></table>";

  const out = sanitizeRenderedHtml(html);

  assert.ok(out.includes("<h2"), "h2 korunmalı");
  assert.ok(out.includes('class="font-bold"'), "Tailwind class korunmalı");
  assert.ok(out.includes("<strong>"), "strong korunmalı");
  assert.ok(out.includes("<li>"), "li korunmalı");
  assert.ok(out.includes("<code>"), "code korunmalı");
  assert.ok(out.includes('href="https://xipsoft.net"'), "https href korunmalı");
  assert.ok(out.includes("<td>"), "td korunmalı");
});

test("img src/alt korunur, yalnızca tehlikeli öznitelikler düşer", () => {
  const out = sanitizeRenderedHtml(
    '<img src="https://cdn.example.com/a.webp" alt="kapak" class="rounded-xl" onerror="alert(1)">',
  );
  assert.ok(out.includes('src="https://cdn.example.com/a.webp"'));
  assert.ok(out.includes('alt="kapak"'));
  assert.ok(out.includes('class="rounded-xl"'));
  assert.ok(!out.includes("onerror"));
});

test("javascript: href yerine href tamamen kaldırılır", () => {
  const out = sanitizeRenderedHtml('<a href="javascript:alert(1)">tıkla</a>');
  assert.ok(!out.toLowerCase().includes("javascript:"));
});

// ── Boş / geçersiz girdi ─────────────────────────────────────────────────────

test("boş, boşluk ve null girdi güvenli şekilde işlenir", () => {
  assert.equal(sanitizeRenderedHtml(""), "");
  assert.equal(sanitizeRenderedHtml("   "), "");
  assert.equal(sanitizeRenderedHtml(null), "");
  assert.equal(sanitizeRenderedHtml(undefined), "");
});

// ── Uçtan uca: lexicalStateToHtml'in ÜÇ yolu da temiz çıktı verir ────────────

test("lexicalStateToHtml — markdown yolu (bozuk JSON fallback) XSS'i durdurur", () => {
  // Admin formu JSON.parse edemediğinde gövdeyi ham string olarak saklar.
  const stored = "bozuk-json<script>alert(1)</script>";
  const out = lexicalStateToHtml(stored);
  assert.ok(!out.toLowerCase().includes("<script"), `markdown yolu sızdı → ${out}`);
});

test("lexicalStateToHtml — ham HTML yolu (startsWith '<') XSS'i durdurur", () => {
  const out = lexicalStateToHtml('<div>merhaba<script>alert(1)</script></div>');
  assert.ok(!out.toLowerCase().includes("<script"), `ham HTML yolu sızdı → ${out}`);
  assert.ok(out.includes("merhaba"), "meşru metin korunmalı");
});

test("lexicalStateToHtml — Lexical text node yolu hâlâ çalışıyor", () => {
  const lexical = {
    root: {
      type: "root",
      children: [
        {
          type: "paragraph",
          children: [{ type: "text", text: "Merhaba dünya", format: 0 }],
        },
      ],
    },
  };
  const out = lexicalStateToHtml(lexical);
  assert.ok(out.includes("Merhaba dünya"), `Lexical yolu bozuldu → ${out}`);
});

test("lexicalStateToHtml — metin node içindeki script kaçmaz", () => {
  const lexical = {
    root: {
      type: "root",
      children: [
        {
          type: "paragraph",
          children: [
            { type: "text", text: '<script>alert(1)</script>', format: 0 },
          ],
        },
      ],
    },
  };
  const out = lexicalStateToHtml(lexical);
  // escapeHtml + DOMPurify çift katman
  assert.ok(!out.includes("<script>alert"), `text node sızdı → ${out}`);
});