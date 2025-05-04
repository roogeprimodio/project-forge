// src/app/canva/layout.tsx
import React from 'react';

// No need for MainLayout here as it's in the root layout.tsx

export default function CanvaLayout({
    children,
}: {
    children: React.ReactNode;
}) {
     // This layout just renders children directly.
     // It exists to ensure the route segment is correctly handled by Next.js App Router.
    return <>{children}</>;
}
