// src/app/register/layout.tsx
import React from 'react';

export default function RegisterLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // This layout renders children directly, preventing the main app layout (with sidebar) from wrapping the registration page.
    // Add a simple centered layout structure.
     return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background via-muted/50 to-background py-8">
             {children}
        </div>
    );
}
