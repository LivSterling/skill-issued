import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Playfair_Display } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import { AuthProviderWrapper } from "@/components/auth/auth-provider"
import { ProfileProviderWrapper } from "@/components/profile/profile-provider"
import { CacheMonitor } from "@/components/debug/cache-monitor"
import "./globals.css"

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  weight: ["400", "700"],
})

export const metadata: Metadata = {
  title: "Skill Issued - Track Your Gaming Journey",
  description:
    "The social network for gamers. Track games you've played, write reviews, and discover your next favorite game.",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable} ${playfair.variable}`}>
        <AuthProviderWrapper>
          <ProfileProviderWrapper>
            <Suspense fallback={null}>{children}</Suspense>
            {process.env.NODE_ENV === 'development' && (
              <CacheMonitor showRealtime={true} />
            )}
          </ProfileProviderWrapper>
        </AuthProviderWrapper>
        <Analytics />
      </body>
    </html>
  )
}
