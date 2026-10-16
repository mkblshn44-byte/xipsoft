/**
 * Health check / status endpoint
 * GET  /api/status  — uptime monitoring, external cron, vb. için
 * POST /api/status  — aynı (bazı monitoring servisleri POST kullanır)
 */

import { NextResponse } from "next/server";
import pool from "@/lib/database";

export const runtime = "nodejs";

async function getStatus() {
  const start = Date.now();
  let dbOk = false;

  try {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not configured");
    }
    await pool.query("SELECT 1");
    dbOk = true;
  } catch (error) {
    console.error(
      "[Status] Database health check failed:",
      error instanceof Error ? error.message : error,
    );
  }

  return NextResponse.json({
    ok: dbOk,
    status: dbOk ? "operational" : "degraded",
    timestamp: new Date().toISOString(),
    db: dbOk ? "connected" : "error",
    latency_ms: Date.now() - start,
    uptime_s: Math.floor(process.uptime()),
    env: process.env.NODE_ENV,
  }, { status: dbOk ? 200 : 503 });
}

export const GET  = () => getStatus();
export const POST = () => getStatus();
