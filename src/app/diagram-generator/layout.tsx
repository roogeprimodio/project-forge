// src/app/diagram-generator/layout.tsx
import React from 'react';

export default function DiagramGeneratorLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // This layout just renders children directly.
    // It exists to ensure the route segment is correctly handled by Next.js App Router
    // and inherits the MainLayout from the root.
    return <>{children}</>;
}
