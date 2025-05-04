// src/app/project/[projectId]/layout.tsx
import React from 'react';

// No need for MainLayout here as it's in the root layout.tsx

export default function ProjectLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // This layout can be used for project-specific shared UI elements
    // that should NOT include the main global sidebar.
    // Currently, it just renders the children directly.
    // The height: 100% ensures it takes up the available space within MainLayout's SidebarInset.
    return <div style={{ height: '100%' }}>{children}</div>;
}
```