// src/components/main-layout.tsx
"use client";

import React from 'react';
import Link from 'next/link';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
} from '@/components/ui/sidebar';
import { LayoutDashboard, User, Image as ImageIcon, Settings } from 'lucide-react'; // Added ImageIcon as placeholder for Canva
import { Button } from '@/components/ui/button';
import { usePathname } from 'next/navigation'; // To highlight active link

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const pathname = usePathname();

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen">
        {/* --- Global Sidebar --- */}
        <Sidebar side="left" collapsible="icon" className="border-r bg-sidebar text-sidebar-foreground">
          <SidebarHeader className="p-4">
             <div className="flex items-center justify-between">
                <h2 className="font-semibold text-lg text-sidebar-primary group-data-[state=collapsed]:hidden text-glow-primary">
                  Project Forge
                </h2>
                {/* Optional: Add a trigger inside header if needed when collapsed */}
                <SidebarTrigger className="hidden group-data-[state=collapsed]:flex text-sidebar-foreground" />
            </div>
          </SidebarHeader>

          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <Link href="/" passHref legacyBehavior>
                    <SidebarMenuButton
                        isActive={pathname === '/'}
                        tooltip="Dashboard"
                        className="text-sidebar-foreground hover:bg-sidebar-accent data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground"
                    >
                        <LayoutDashboard />
                        <span className="group-data-[state=collapsed]:hidden">Dashboard</span>
                    </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
              <SidebarMenuItem>
                 <Link href="/profile" passHref legacyBehavior>
                    <SidebarMenuButton
                        isActive={pathname === '/profile'}
                        tooltip="Profile"
                         className="text-sidebar-foreground hover:bg-sidebar-accent data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground"
                    >
                        <User />
                        <span className="group-data-[state=collapsed]:hidden">Profile</span>
                    </SidebarMenuButton>
                 </Link>
              </SidebarMenuItem>
              <SidebarMenuItem>
                 <Link href="/canva" passHref legacyBehavior>
                    <SidebarMenuButton
                        isActive={pathname === '/canva'}
                        tooltip="Canva (Placeholder)"
                        className="text-sidebar-foreground hover:bg-sidebar-accent data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground"
                    >
                        {/* Using ImageIcon as a placeholder for Canva */}
                        <ImageIcon />
                        <span className="group-data-[state=collapsed]:hidden">Canva</span>
                    </SidebarMenuButton>
                 </Link>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>

           <SidebarFooter className="p-4 border-t border-sidebar-border group-data-[state=collapsed]:hidden">
                {/* Example Footer Content */}
                <Button variant="ghost" size="sm" className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                    <Settings className="mr-2"/> Settings
                </Button>
           </SidebarFooter>
        </Sidebar>

        {/* --- Main Content Area --- */}
        <SidebarInset className="flex-1 flex flex-col bg-background">
             {/* Header inside the main content area */}
           <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur-sm px-4 lg:h-[60px] lg:px-6">
               <SidebarTrigger className="md:hidden text-foreground" /> {/* Trigger for mobile */}
               {/* Maybe add breadcrumbs or page title here */}
           </header>
           {/* Page content renders here */}
           <div className="flex-1 overflow-auto">
                {children}
           </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
