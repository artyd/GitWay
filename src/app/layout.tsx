import type { Metadata } from "next";
import { Nunito, Baloo_2 } from "next/font/google";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "600", "700", "800"],
  display: "swap",
});

// Baloo 2 має лише латиницю — для кирилиці автоматично підхопиться Nunito.
const baloo = Baloo_2({
  variable: "--font-baloo",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "GitШлях — курс для керівників відділів",
  description:
    "Курс з нуля: Git, GitHub і робота з AI-агентами (Claude Code, Codex) для керівників відділів",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk" className={`${nunito.variable} ${baloo.variable}`}>
      <body>{children}</body>
    </html>
  );
}
