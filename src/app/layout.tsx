import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { AppToaster } from "@/components/theme/app-toaster";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

const themeScript = `
(function () {
  try {
    var stored = localStorage.getItem("cowork:theme");
    var theme = stored === "light" || stored === "dark" || stored === "system" ? stored : "dark";
    var dark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
  } catch (error) {
    document.documentElement.classList.add("dark");
  }
})();
`;

export const metadata: Metadata = {
  title: {
    default: "CoWork Studio — realtime workspace for thoughtful teams",
    template: "%s · CoWork Studio",
  },
  description:
    "A real-time collaborative workspace with live cursors, comments, version history and CRDT-backed editing.",
  applicationName: "CoWork Studio",
  authors: [{ name: "CoWork Studio" }],
  keywords: ["collaboration", "workspace", "Yjs", "CRDT", "editor"],
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  colorScheme: "light dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`${geist.variable} ${geistMono.variable} bg-canvas font-sans text-ink antialiased`}
      >
        <ThemeProvider>
          {children}
          <AppToaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
