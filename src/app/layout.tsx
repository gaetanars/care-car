import type { Metadata } from "next";
import { Suspense } from "react";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import { AppNav } from "@/components/app-nav";
import "./globals.css";

const display = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
});

const text = Figtree({
  variable: "--font-text",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CareCar",
  description: "Carnet d'entretien véhicules",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${display.variable} ${text.variable} h-full`}>
      <body className="min-h-full">
        <Suspense fallback={null}>
          <AppNav />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
