import assert from "node:assert/strict";
import { test } from "node:test";
import { GET } from "./route";

test("status endpoint reports missing database configuration as unavailable", async () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;

  try {
    const response = await GET();
    const body = await response.json();

    assert.equal(response.status, 503);
    assert.equal(body.ok, false);
    assert.equal(body.status, "degraded");
    assert.equal(body.db, "error");
  } finally {
    if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalDatabaseUrl;
  }
});
