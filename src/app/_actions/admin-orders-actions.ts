"use server";

import { query, queryOne } from "@/lib/database";
import { getServerActionContext } from "@/lib/api-guard";
import { NextResponse } from "next/server";

export interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  total_amount: number;
  status: string;
  payment_provider: string;
  created_at: string;
}

async function assertAdmin() {
  const ctx = await getServerActionContext();
  if (!ctx.isAuthenticated || ctx.userRole !== "admin") {
    throw new Error("Admin yetkisi gerekiyor");
  }
}

export async function getOrdersAction(): Promise<{ success: boolean; data: Order[]; error?: string }> {
  try {
    await assertAdmin();
    const data = await query<Order>(
      `SELECT o.*, u.display_name as customer_name, u.email as customer_email
       FROM orders o LEFT JOIN users u ON o.user_id = u.id
       ORDER BY o.created_at DESC`
    );
    return { success: true, data };
  } catch (err: any) {
    return { success: false, data: [], error: err.message };
  }
}

export async function updateOrderStatusAction(orderId: string, status: string): Promise<{ success: boolean; error?: string }> {
  try {
    await assertAdmin();
    await query("UPDATE orders SET status=$1, updated_at=NOW() WHERE id=$2", [status, orderId]);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
