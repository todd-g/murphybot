import type { Metadata } from "next";
import { Roboto, Playfair_Display, Fira_Code } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "@/lib/convex";

const roboto = Roboto({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const playfairDisplay = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin"],
});

const firaCode = Fira_Code({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MurphyBot - Second Brain",
  description: "Your AI-powered second brain. Capture, organize, and query your knowledge.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark theme">
      <body
        className={`${roboto.variable} ${playfairDisplay.variable} ${firaCode.variable} font-sans antialiased min-h-screen`}
      >
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
