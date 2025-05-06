
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
    // Simulate checking login status - replace with actual auth check
    // For now, assume logged in if not on login/register pages
    setIsLoggedIn(!(pathname === '/login' || pathname === '/register'));
  }, [pathname]);

  const handleLogout = () => {
    // Simulate logout process
    console.log('Logging out...');
    setIsLoggedIn(false);
    toast({
        title: 'Logged Out',
        description: 'You have been successfully logged out.',
    });
    router.push('/login'); // Redirect to login page
  };

  const handleLogin = () => {
     router.push('/login');
  }

  // Determine if the sidebar should be shown based on route and mount status
  const showSidebar = !(pathname === '/login' || pathname === '/register') && hasMounted;

  // Avoid rendering anything until mounted to prevent hydration mismatches
  if (!hasMounted) {
      // Optionally return a simple loading state or null
      return null; // Or a basic loading skeleton
  }

  // If sidebar shouldn't be shown (login/register), render children directly
  if (!showSidebar) {
      return <>{children}</>;
  }

  // Main layout with sidebar
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen bg-background"> {/* Ensure background color */}
        {/* Sidebar definition */}
        <Sidebar side="left" collapsible="icon" className="border-r bg-sidebar text-sidebar-foreground hidden md:flex md:flex-col"> {/* Hide on mobile initially, flex-col added */}
          <SidebarHeader className="p-4">
             <div className="flex items-center justify-between">
                <Link href="/" passHref legacyBehavior>
                  <a className="font-semibold text-lg text-sidebar-primary group-data-[state=collapsed]:hidden text-glow-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring rounded">
                    Project Forge
                  </a>
                </Link>
                {/* Desktop trigger - hidden when collapsed */}
                <SidebarTrigger className="hidden group-data-[state=expanded]:flex text-sidebar-foreground" />
            </div>
          </SidebarHeader>

          {/* Sidebar Content */}
          <SidebarContent className="flex-1 flex flex-col"> {/* flex-1 needed */}
            <SidebarMenu className="flex-1"> {/* flex-1 needed */}
              {/* Dashboard Link */}
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
              {/* Profile Link */}
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
              {/* Canva Link */}
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

          {/* Sidebar Footer */}
           <SidebarFooter className="p-4 border-t border-sidebar-border space-y-2">
                {/* Login/Logout Button */}
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
                 {/* Settings Button - Placeholder */}
                 <Button variant="ghost" size="sm" className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[state=collapsed]:hidden">
                     <Settings className="mr-2"/> Settings
                 </Button>
                 {/* Theme Toggle */}
                 <ThemeToggle />
           </SidebarFooter>
        </Sidebar>

        {/* Main content area */}
        <SidebarInset className="flex-1 flex flex-col bg-background"> {/* flex-1 needed */}
           {/* Header for the main content area */}
           <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur-sm px-4 lg:h-[60px] lg:px-6">
               {/* Mobile trigger - always visible */}
               <SidebarTrigger className="md:hidden text-foreground" /> {/* Show only on mobile */}
               {/* You can add breadcrumbs, page title, or other header content here */}
           </header>
           {/* The actual page content */}
           <div className="flex-1 overflow-auto"> {/* flex-1 and overflow-auto */}
                {children}
           </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
