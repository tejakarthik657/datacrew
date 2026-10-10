import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/providers/Providers";

export const metadata: Metadata = {
  title: {
    default: "DataCrew — AI Data Team",
    template: "%s | DataCrew",
  },
  description:
    "DataCrew: messy data in, trusted data out. AI-powered data cleaning, risk auditing, forecasting and Data Passports.",
  keywords: ["data cleaning", "AI", "data quality", "data passport", "ETL"],
  openGraph: {
    title: "DataCrew — AI Data Team",
    description: "Messy data in, trusted data out.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
