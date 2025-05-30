
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
        {/* Placeholder for Adsterra main script - Replace with actual script from Adsterra */}
        <Script
          strategy="afterInteractive" // Load after page becomes interactive
          id="adsterra-main-script" // Unique ID for the script
          // src="https://placeholder.adsterradomain.com/main.js" // Replace with ACTUAL Adsterra script URL
          // If Adsterra provides an inline script, use dangerouslySetInnerHTML (less common for main script)
          // dangerouslySetInnerHTML={{ __html: `console.log("Adsterra Main Script Placeholder Loaded");` }}
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
