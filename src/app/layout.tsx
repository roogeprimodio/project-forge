import type {Metadata} from 'next';
import {Geist} from 'next/font/google'; // Assuming Geist_Sans is still the desired font
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { MainLayout } from '@/components/main-layout';
import { cn } from '@/lib/utils';
import { ThemeProvider } from '@/components/theme-provider'; // Import ThemeProvider

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
