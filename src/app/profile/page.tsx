// src/app/profile/page.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User } from 'lucide-react';

export default function ProfilePage() {
  return (
    <div className="container mx-auto p-4 md:p-8">
      <Card className="max-w-2xl mx-auto shadow-lg">
        <CardHeader className="text-center">
          <Avatar className="w-24 h-24 mx-auto mb-4 border-2 border-primary">
            <AvatarImage src="https://picsum.photos/200/200" alt="User Avatar" data-ai-hint="professional person portrait"/>
            <AvatarFallback>
              <User className="w-12 h-12 text-muted-foreground" />
            </AvatarFallback>
          </Avatar>
          <CardTitle className="text-2xl text-primary text-glow-primary">User Profile</CardTitle>
          <CardDescription>Manage your account settings and profile information.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Placeholder content */}
          <div className="p-6 border rounded-md bg-muted/30">
            <p className="text-muted-foreground">Profile details and settings will be available here.</p>
            <p className="text-muted-foreground mt-2">Features like changing name, email, password, and theme preferences could be added.</p>
          </div>
           <div className="text-center mt-6">
            <p className="text-sm text-muted-foreground">(This is a placeholder screen)</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```