import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { JetBrains_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import "./globals.css"

const googleSans = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-google-sans",
})

const googleSansMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-google-sans-mono",
})

export const metadata: Metadata = {
  title: "Gantt Maestro - Free Gantt Chart Generator",
  description: "Free Gantt chart generator, locally in your browser. No login/signup required.",
  authors: [{ name: "Rayhan0x01", url: "https://github.com/rayhan0x01" }],
  creator: "Rayhan0x01",
  publisher: "Rayhan0x01",
  openGraph: {
    title: "Gantt Maestro - Free Gantt Chart Generator",
    description: "Free Gantt chart generator, locally in your browser. No login/signup required.",
    siteName: "Gantt Maestro",
    locale: "en_US",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans ${googleSans.variable} ${googleSansMono.variable} antialiased`}>
        <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>
        <Analytics />
      </body>
    </html>
  )
}
