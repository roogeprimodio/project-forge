// src/app/ai-tools/concept-explainer/layout.tsx
import React from 'react';

export default function ConceptExplainerLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // This layout just renders children directly.
    // It ensures the route segment is correctly handled and inherits MainLayout from the root.
    return <>{children}</>;
}