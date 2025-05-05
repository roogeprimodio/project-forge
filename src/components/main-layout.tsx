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
import { LayoutDashboard, User, Image as ImageIcon, Settings, LogIn, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePathname } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { ThemeToggle } from '@/components/theme-toggle'; // Import ThemeToggle

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoggedIn, setIsLoggedIn] = useState(false); // Placeholder login state
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
    setIsLoggedIn(!(pathname === '/login' || pathname === '/register'));
  }, [pathname]);

  const handleLogout = () => {
    console.log('Logging out...');
    setIsLoggedIn(false);
    toast({
        title: 'Logged Out',
        description: 'You have been successfully logged out.',
    });
    router.push('/login');
  };

  const handleLogin = () => {
     router.push('/login');
  }

  const showSidebar = !(pathname === '/login' || pathname === '/register') && hasMounted;

  if (!hasMounted) {
      return null;
  }

  if (!showSidebar) {
      return <>{children}</>;
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen">
        <Sidebar side="left" collapsible="icon" className="border-r bg-sidebar text-sidebar-foreground">
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
                        tooltip="Canvas"
                        className="text-sidebar-foreground hover:bg-sidebar-accent data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground"
                    >
                        <ImageIcon />
                        <span className="group-data-[state=collapsed]:hidden">Canva</span>
                    </SidebarMenuButton>
                 </Link>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>

           <SidebarFooter className="p-4 border-t border-sidebar-border space-y-2">
                {isLoggedIn ? (
                    <Button variant="ghost" size="sm" onClick={handleLogout} className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[state=collapsed]:justify-center group-data-[state=collapsed]:px-0 group-data-[state=collapsed]:aspect-square" title="Log Out">
                        <LogOut />
                        <span className="group-data-[state=collapsed]:hidden ml-2">Log Out</span>
                    </Button>
                 ) : (
                     <Button variant="ghost" size="sm" onClick={handleLogin} className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[state=collapsed]:justify-center group-data-[state=collapsed]:px-0 group-data-[state=collapsed]:aspect-square" title="Log In">
                        <LogIn />
                        <span className="group-data-[state=collapsed]:hidden ml-2">Log In</span>
                    </Button>
                 )}
                 <Button variant="ghost" size="sm" className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[state=collapsed]:hidden">
                     <Settings className="mr-2"/> Settings
                 </Button>
                 <ThemeToggle /> {/* Add ThemeToggle component here */}
           </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex-1 flex flex-col bg-background">
           <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur-sm px-4 lg:h-[60px] lg:px-6">
               <SidebarTrigger className="hidden md:flex text-foreground" />
           </header>
           <div className="flex-1 overflow-auto">
                {children}
           </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
