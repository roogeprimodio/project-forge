// src/app/profile/page.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { User, Mail, Bell, Palette, ShieldCheck, Activity, Edit3, LogOut } from 'lucide-react';

export default function ProfilePage() {
  // Placeholder data - replace with actual user data if authentication is added
  const user = {
    name: 'Alex Doe',
    email: 'alex.doe@example.com',
    avatarUrl: 'https://picsum.photos/id/237/200/200', // Example avatar
    joinDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 90), // Joined 90 days ago
    projectsCount: 5,
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <Card className="max-w-3xl mx-auto shadow-lg overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-primary/10 via-background to-primary/10 p-6 md:p-8 relative">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <Avatar className="w-24 h-24 md:w-32 md:h-32 border-4 border-background shadow-md hover:scale-105 transition-transform duration-300">
              <AvatarImage src={user.avatarUrl} alt={user.name} data-ai-hint="professional person portrait"/>
              <AvatarFallback className="text-4xl">
                {user.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="text-center md:text-left">
              <CardTitle className="text-3xl font-bold text-primary text-glow-primary">{user.name}</CardTitle>
              <CardDescription className="text-lg text-muted-foreground mt-1 flex items-center justify-center md:justify-start gap-2">
                <Mail className="w-4 h-4" /> {user.email}
              </CardDescription>
              <p className="text-sm text-muted-foreground mt-2">Joined {user.joinDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <p className="text-sm text-muted-foreground">{user.projectsCount} Projects Created</p>
            </div>
            <Button variant="outline" size="sm" className="absolute top-4 right-4 focus-visible:glow-accent hover:glow-accent">
              <Edit3 className="mr-2 h-4 w-4" /> Edit Profile
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Personal Information & Settings Section */}
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-primary flex items-center gap-2"><User className="w-5 h-5" /> Account Details</h3>
            <div className="space-y-3 text-sm">
              <p><strong className="text-foreground">Username:</strong> {user.name.toLowerCase().replace(' ', '_')}</p>
              <p><strong className="text-foreground">Email:</strong> {user.email}</p>
              <Button variant="link" className="p-0 h-auto text-primary hover:underline">Change Password</Button>
            </div>

            <Separator />

            <h3 className="text-xl font-semibold text-primary flex items-center gap-2"><Palette className="w-5 h-5" /> Preferences</h3>
            <div className="space-y-3 text-sm">
              <p><strong className="text-foreground">Theme:</strong> Light (Option to switch)</p>
              <p><strong className="text-foreground">Language:</strong> English (US)</p>
            </div>

            <Separator />

             <h3 className="text-xl font-semibold text-primary flex items-center gap-2"><Bell className="w-5 h-5" /> Notifications</h3>
             <div className="space-y-3 text-sm text-muted-foreground">
                <p>Manage notification preferences here (e.g., email updates, project alerts).</p>
                 {/* Add Switches or Checkboxes here later */}
             </div>

              <Separator />

             <h3 className="text-xl font-semibold text-primary flex items-center gap-2"><ShieldCheck className="w-5 h-5" /> Security</h3>
             <div className="space-y-3 text-sm text-muted-foreground">
                <p>Review login activity and security settings.</p>
                <Button variant="link" className="p-0 h-auto text-primary hover:underline">View Login History</Button>
             </div>

             <Separator />
              <Button variant="destructive" className="w-full mt-4">
                <LogOut className="mr-2 h-4 w-4" /> Log Out
              </Button>
          </div>

          {/* Activity Feed Section (Placeholder) */}
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-primary flex items-center gap-2"><Activity className="w-5 h-5" /> Recent Activity</h3>
            <div className="space-y-4 text-sm p-4 border rounded-md bg-muted/30 min-h-[200px] flex flex-col justify-center items-center">
              <p className="text-muted-foreground">Your recent project activities will appear here.</p>
              <p className="text-xs text-muted-foreground">(e.g., "Created project 'AI Report'", "Generated 'Introduction' section")</p>
            </div>
             <div className="text-center mt-6">
                 <p className="text-sm text-muted-foreground">(Profile page is currently a placeholder)</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
