import { AnalyticsProvider } from "@/components/providers/analytics-provider";
import { PostHogPageView } from "@/components/providers/posthog-page-view";
import AppProvider from "@/components/providers/app-provider";
import { AuthProvider } from "@/components/providers/auth-provider";
import type { Metadata } from "next";
import {
  Anek_Devanagari,
  Noto_Sans_Devanagari,
  Orbitron,
} from "next/font/google";
import { Suspense } from "react";
import { LimitedToaster } from "@/components/providers/limited-toaster";
import "./globals.css";

const notoSansDevanagari = Noto_Sans_Devanagari({
  variable: "--font-noto-sans-devanagari",
  subsets: ["devanagari"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

const anekDevanagari = Anek_Devanagari({
  variable: "--font-anek-devanagari",
  subsets: ["devanagari"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800"],
});

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: {
    default: "Samvaad Saathi - AI-Powered Interview Preparation Platform",
    template: "%s | Samvaad Saathi",
  },
  description:
    "Master your interviews with Samvaad Saathi - India's leading AI-powered interview preparation platform. Practice with voice-based interviews, get instant feedback, and boost your confidence for job interviews.",
  keywords: [
    "interview preparation",
    "AI interview practice",
    "voice-based interviews",
    "job interview training",
    "interview coaching",
    "career development",
    "interview skills",
    "mock interviews",
    "interview feedback",
    "Samvaad Saathi",
  ],
  authors: [{ name: "Samvaad Saathi Team" }],
  creator: "Samvaad Saathi",
  publisher: "Samvaad Saathi",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ||
      "https://samvaad-sathi.barabaricollective.org",
  ),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "/",
    title: "Samvaad Saathi - AI-Powered Interview Preparation Platform",
    description:
      "Master your interviews with Samvaad Saathi - India's leading AI-powered interview preparation platform. Practice with voice-based interviews, get instant feedback, and boost your confidence for job interviews.",
    siteName: "Samvaad Saathi",
    images: [
      {
        url: "/barabari_logo.png",
        width: 1200,
        height: 630,
        alt: "Samvaad Saathi - AI Interview Preparation Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Samvaad Saathi - AI-Powered Interview Preparation Platform",
    description:
      "Master your interviews with Samvaad Saathi - India's leading AI-powered interview preparation platform.",
    images: ["/barabari_logo.png"],
    creator: "@samvaadsaathi",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32", type: "image/x-icon" },
      { url: "/favicon.ico", sizes: "16x16", type: "image/x-icon" },
    ],
    apple: [{ url: "/barabari_logo.png", sizes: "180x180", type: "image/png" }],
    other: [
      {
        rel: "mask-icon",
        url: "/barabari_logo.png",
        color: "#000000",
      },
    ],
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Samvaad Saathi",
    alternateName: "Samvaad Saathi - AI Interview Preparation Platform",
    description:
      "Master your interviews with Samvaad Saathi - India's leading AI-powered interview preparation platform. Practice with voice-based interviews, get instant feedback, and boost your confidence for job interviews.",
    url:
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://samvaad-sathi.barabaricollective.org",
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web Browser",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "INR",
    },
    creator: {
      "@type": "Organization",
      name: "Samvaad Saathi Team",
    },
    featureList: [
      "AI-powered interview practice",
      "Voice-based interview simulation",
      "Real-time feedback and analysis",
      "Interview history tracking",
      "Personalized interview questions",
      "Resume analysis and optimization",
    ],
    browserRequirements: "Requires JavaScript. Requires HTML5.",
    softwareVersion: "1.0.0",
    datePublished: "2024-01-01",
    inLanguage: ["hi", "en"],
  };

  return (
    <html lang="hi" suppressHydrationWarning data-theme="light">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body
        className={`${notoSansDevanagari.variable} ${anekDevanagari.variable} ${orbitron.variable} antialiased`}
      >
        <AppProvider>
          <AuthProvider>
            <AnalyticsProvider>
              <Suspense fallback={null}>
                <PostHogPageView />
                {children}
              </Suspense>
            </AnalyticsProvider>
            <LimitedToaster />
          </AuthProvider>
        </AppProvider>
      </body>
    </html>
  );
}
