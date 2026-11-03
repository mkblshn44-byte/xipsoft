import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { NextRequest } from "next/server";
import {
  getRedirectTarget,
  handleRedirect,
  invalidateRedirectCache,
  recordBlogPostSlugChange,
} from "@/lib/redirect-handler";

async function verifyRedirectFlow() {
  const connectionString = process.env.REDIRECT_TEST_DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "REDIRECT_TEST_DATABASE_URL must point to a non-production test database.",
    );
  }
  if (process.env.REDIRECT_TEST_CONFIRM !== "ROLLBACK-ONLY") {
    throw new Error(
      "Set REDIRECT_TEST_CONFIRM=ROLLBACK-ONLY to opt in to the isolated transaction test.",
    );
  }
  if (connectionString === process.env.DATABASE_URL) {
    throw new Error(
      "Redirect integration test refuses to use DATABASE_URL; use a dedicated test database.",
    );
  }

  const client = new Client({
    connectionString,
    connectionTimeoutMillis: 10_000,
  });
  const suffix = randomUUID();
  const oldSlug = `redirect-test-old-${suffix}`;
  const newSlug = `redirect-test-new-${suffix}`;
  const oldPath = `/blog/${oldSlug}`;
  let connected = false;

  try {
    await client.connect();
    connected = true;
    await client.query("BEGIN");
    await recordBlogPostSlugChange(client, oldSlug, newSlug);

    const entry = await getRedirectTarget(oldPath, client);
    assert.deepEqual(entry, {
      target_path: `/blog/${newSlug}`,
      status_code: 301,
    });

    const response = await handleRedirect(
      new NextRequest(`https://xipsoft.test${oldPath}`),
      (pathname) => getRedirectTarget(pathname, client),
    );
    assert.ok(response);
    assert.equal(response.status, 301);
    assert.equal(
      response.headers.get("location"),
      `https://xipsoft.test/blog/${newSlug}`,
    );

    console.log("Redirect integration flow passed; transaction will be rolled back.");
  } finally {
    if (connected) {
      await client.query("ROLLBACK").catch(() => undefined);
      await client.end();
    }
    invalidateRedirectCache(oldPath);
  }
}

verifyRedirectFlow().catch((error: unknown) => {
  console.error("Redirect integration flow failed:", error);
  process.exitCode = 1;
});
