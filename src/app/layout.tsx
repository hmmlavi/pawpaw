import type { Metadata, Viewport } from "next";
import { Sora, Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const sora = Sora({ subsets: ["latin"], variable: "--font-display", weight: ["400", "500", "600", "700", "800"] });
const inter = Inter({ subsets: ["latin"], variable: "--font-body", weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: { default: "Pawkind — A digital world for pets", template: "%s · Pawkind" },
  description: "The pet-centered social ecosystem. Pets are the stars: social profiles, reels, stories, AI care assistant, local communities, events, clinics, adoption and private health records.",
};

export const viewport: Viewport = {
  themeColor: "#0b0c0e",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${sora.variable} ${inter.variable} min-h-dvh`}>
        <div className="ambient" aria-hidden>
          <div className="ambient-blob a" />
          <div className="ambient-blob b" />
          <div className="ambient-blob c" />
        </div>
        {children}
        <Toaster
          theme="dark"
          position="top-center"
          toastOptions={{
            style: {
              background: "rgba(18,20,24,0.9)",
              border: "1px solid rgba(255,255,255,0.1)",
              backdropFilter: "blur(16px)",
              color: "#e9eae6",
              borderRadius: "14px",
            },
          }}
        />
      </body>
    </html>
  );
}
