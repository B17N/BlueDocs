// 声明此组件为客户端组件，需要在浏览器中运行（因为需要状态管理和交互）
"use client"
import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ConditionalLayout } from "@/components/conditional-layout";

const inter = Inter({ subsets: ["latin"] });

/*
export const metadata: Metadata = {
  title: "Web3 Encrypted Markdown Manager",
  description: "Manage your encrypted Markdown files on Web3",
  generator: "v0.dev",
};
*/
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          themes={['light', 'dark', 'blue', 'green', 'pink', 'purple']}
        >
          <ConditionalLayout>{children}</ConditionalLayout>
        </ThemeProvider>
      </body>
    </html>
  );
}
