import type {Metadata} from 'next';
import {Geist} from 'next/font/google'; // Removed Geist_Mono as it's not explicitly used
import './globals.css';
import { Toaster } from "@/components/ui/toaster"; // Import Toaster

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
    <html lang="en">
      {/* Removed geistMono variable from class name */}
      <body className={`${geistSans.variable} antialiased`}>
        {children}
        <Toaster /> {/* Add Toaster component here */}
      </body>
    </html>
  );
}
