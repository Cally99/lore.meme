// app/layout.tsx
import type React from "react";
import { Suspense } from "react";
import "@/app/globals.css";
import { AppProviders } from "@/providers/AppProviders";
import DesktopNav from "@/components/navigation/DesktopNav";
import MobileNav from "@/components/navigation/MobileNav";
import { Footer } from "@/components/navigation/Footer";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export const metadata = {
  title: "Lore.meme - Tell Your Token's Story",
  description: "The premier platform for cryptocurrency projects to highlight their token's narrative, vision, and purpose.",
};

function NavLoading() {
  return (
    <div className="h-16 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
      <LoadingSpinner size="sm" />
    </div>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />    
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="min-h-screen bg-white dark:bg-gray-900 font-sans antialiased">
        <AppProviders>
          <div className="flex flex-col min-h-screen">
            <Suspense fallback={<NavLoading />}>
              <MobileNav />
              <DesktopNav />
            </Suspense>
            
            <main className="flex-grow">
              {children}
            </main>
            
            <Footer />
          </div>
        </AppProviders>
      </body>
    </html>
  );
}
