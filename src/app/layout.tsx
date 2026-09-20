import type { Metadata, Viewport } from "next";
import { Sora, Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToaster } from "@/components/theme-toaster";
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
  colorScheme: "dark light",
};

// Runs before first paint so the saved/system theme applies without flashing.
const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('pawkind-theme')||'system';var r=t==='system'?(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'):t;document.documentElement.dataset.theme=r;if(r==='dark'){document.documentElement.classList.add('dark');}else{document.documentElement.classList.remove('dark');}document.documentElement.style.colorScheme=r;}catch(e){document.documentElement.dataset.theme='dark';}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className={`${sora.variable} ${inter.variable} min-h-dvh`}>
        <ThemeProvider>
          <div className="ambient" aria-hidden>
            <div className="ambient-blob a" />
            <div className="ambient-blob b" />
            <div className="ambient-blob c" />
          </div>
          {children}
          <ThemeToaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
