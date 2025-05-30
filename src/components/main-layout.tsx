
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import { LayoutDashboard, User, Image as ImageIcon, Settings, LogIn, LogOut, GitGraph, BookOpen, FolderGit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePathname } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { ThemeToggle } from '@/components/theme-toggle';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);


  if (!hasMounted) {
      return null;
  }

  // Since login/register pages are removed, the sidebar will always be shown.
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen bg-background">
        <Sidebar side="left" collapsible="icon" className="border-r bg-sidebar text-sidebar-foreground hidden md:flex md:flex-col">
          <SidebarHeader className="p-4">
             <div className="flex items-center justify-between">
                <Link href="/" passHref legacyBehavior>
                  <a className="font-semibold text-lg text-sidebar-primary group-data-[state=collapsed]:hidden text-glow-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring rounded">
                    Project Forge
                  </a>
                </Link>
                <SidebarTrigger className="hidden group-data-[state=expanded]:flex text-sidebar-foreground" />
            </div>
          </SidebarHeader>

          <SidebarContent className="flex-1 flex flex-col">
            <SidebarMenu className="flex-1">
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
                        tooltip="Canvas Editor"
                        className="text-sidebar-foreground hover:bg-sidebar-accent data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground"
                    >
                        <ImageIcon />
                        <span className="group-data-[state=collapsed]:hidden">Canva Editor</span>
                    </SidebarMenuButton>
                 </Link>
              </SidebarMenuItem>
              <SidebarMenuItem>
                 <Link href="/diagram-generator" passHref legacyBehavior>
                    <SidebarMenuButton
                        isActive={pathname === '/diagram-generator'}
                        tooltip="Diagram Generator"
                        className="text-sidebar-foreground hover:bg-sidebar-accent data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground"
                    >
                        <GitGraph />
                        <span className="group-data-[state=collapsed]:hidden">Diagram Generator</span>
                    </SidebarMenuButton>
                 </Link>
              </SidebarMenuItem>
              <SidebarMenuItem>
                 <Link href="/ai-tools/concept-explainer" passHref legacyBehavior>
                    <SidebarMenuButton
                        isActive={pathname === '/ai-tools/concept-explainer'}
                        tooltip="AI Concept Explainer"
                        className="text-sidebar-foreground hover:bg-sidebar-accent data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground"
                    >
                        <BookOpen />
                        <span className="group-data-[state=collapsed]:hidden">Concept Explainer</span>
                    </SidebarMenuButton>
                 </Link>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>

           <SidebarFooter className="p-4 border-t border-sidebar-border space-y-2">
                 <Button variant="ghost" size="sm" className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[state=collapsed]:hidden">
                     <Settings className="mr-2"/> Settings
                 </Button>
                 <ThemeToggle />
           </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex-1 flex flex-col bg-background">
           <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur-sm px-4 lg:h-[60px] lg:px-6">
               <SidebarTrigger className="md:hidden text-foreground" />
           </header>
           <div className="flex-1 overflow-auto">
                {children}
           </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
