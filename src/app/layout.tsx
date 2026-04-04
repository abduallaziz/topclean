import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TOP CLEAN — نظام إدارة المغسلة",
  description: "نظام كاشير وإدارة متكامل لمغاسل السيارات",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ margin: 0, padding: 0, background: "#0a0f1e" }}>
        {children}
      </body>
    </html>
  );
}
