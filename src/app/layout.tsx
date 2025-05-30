
import type {Metadata} from 'next';
import {Geist} from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { MainLayout } from '@/components/main-layout';
import { cn } from '@/lib/utils';
import { ThemeProvider } from '@/components/theme-provider';
import Script from 'next/script'; // Import Script

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Project Forge',
  description: 'AI-Powered Final Year Project Assistant',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Adsterra main script */}
        <Script
          strategy="afterInteractive" // Load after page becomes interactive
          id="adsterra-main-script" // Unique ID for the script
          src="//pl26788890.profitableratecpm.com/d40008e783e882e0b2cc3a06a41eac65/invoke.js"
          async={true} // Corresponds to async="async"
          data-cfasync="false" // Pass custom data attributes
        />
      </head>
      <body className={cn(
          "antialiased",
          geistSans.variable
        )}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <MainLayout>
            {children}
          </MainLayout>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
