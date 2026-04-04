// src/app/page.tsx
// الصفحة الرئيسية — تحوّل للكاشير تلقائياً
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/pos");
}
