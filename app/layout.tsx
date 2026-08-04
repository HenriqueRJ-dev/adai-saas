import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AdAI — Anúncios no piloto automático",
  description:
    "Conecte seu Instagram e deixe a IA criar, publicar e otimizar seus anúncios no Meta Ads.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
