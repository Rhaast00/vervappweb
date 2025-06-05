import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "../context/AuthContext";
import { WebsiteProvider } from "../context/WebsiteContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "VervApp - AI Website Redesign",
  description: "Analyze and redesign websites with AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <WebsiteProvider>
            {children}
          </WebsiteProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
