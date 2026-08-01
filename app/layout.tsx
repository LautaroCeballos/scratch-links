import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Scratch Links · Verificador de proyectos",
  description:
    "Verificá que tu proyecto de Scratch sea público y no sea el original de la competencia antes de entregarlo. Widget embebible para Genially.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={nunito.variable}>
      <body>{children}</body>
    </html>
  );
}
