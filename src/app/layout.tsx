import type {Metadata} from 'next';
import {Geist} from 'next/font/google'; // Removed Geist_Mono as it's not explicitly used
import './globals.css';
import { Toaster } from "@/components/ui/toaster"; // Import Toaster
import { MainLayout } from '@/components/main-layout'; // Import MainLayout
import { cn } from '@/lib/utils'; // Import cn utility

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

// Removed geistMono as it's not explicitly used in the base layout

export const metadata: Metadata = {
  title: 'Project Forge', // Updated title
  description: 'AI-Powered Final Year Project Assistant', // Updated description
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* Removed whitespace/comment from here */}
      <body className={cn(
          "antialiased",
          geistSans.variable // Apply font variable correctly
        )}>
        <MainLayout> {/* Wrap children with MainLayout */}
          {children}
        </MainLayout>
        <Toaster /> {/* Corrected typo: Toastaster -> Toaster */}
      </body>
    </html>
  );
}
