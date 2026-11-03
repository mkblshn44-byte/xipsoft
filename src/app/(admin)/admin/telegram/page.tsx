import type { Metadata } from "next";
import AdminTelegramClient from "./AdminTelegramClient";

export const metadata: Metadata = {
  title: "Telegram | Admin XipSoft",
  robots: { index: false, follow: false },
};

export default function AdminTelegramPage() {
  return <AdminTelegramClient />;
}
