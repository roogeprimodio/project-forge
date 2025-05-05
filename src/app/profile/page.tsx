// src/app/profile/page.tsx
"use client"; // Make this a client component for state management

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input'; // Import Input
import { Label } from '@/components/ui/label'; // Import Label
import { useToast } from '@/hooks/use-toast'; // Import useToast
import { useLocalStorage } from '@/hooks/use-local-storage';
import { User, Mail, Bell, Palette, ShieldCheck, Activity, Edit3, LogOut, Save, XCircle, Loader2 } from 'lucide-react';

export default function ProfilePage() {
    const router = useRouter();
    const { toast } = useToast();

    // State for user data (could come from context or API later)
    const [user, setUser] = useState({
        name: 'Alex Doe',
        email: 'alex.doe@example.com',
        avatarUrl: 'https://picsum.photos/id/237/200/200', // Example avatar
        username: 'alex_doe', // Added username
    });

    // State for API keys, using local storage
    const [geminiApiKey, setGeminiApiKey] = useLocalStorage<string>('geminiApiKey', '');
    const [openaiApiKey, setOpenaiApiKey] = useLocalStorage<string>('openaiApiKey', '');

    // State for profile editing
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({ name: '', email: '', username: '' });
    const [isSaving, setIsSaving] = useState(false);

    // Effect to initialize edit form when editing starts or user data changes
    useEffect(() => {
        if (isEditing) {
            setEditForm({
                name: user.name,
                email: user.email,
                username: user.username,
            });
        }
    }, [isEditing, user]);

    const handleEditToggle = () => {
        setIsEditing(!isEditing);
        // Reset form state if canceling edit
        if (isEditing) {
            setEditForm({ name: user.name, email: user.email, username: user.username });
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setEditForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = () => {
        setIsSaving(true);
        // Simulate saving data
        console.log('Saving profile:', editForm);
        setTimeout(() => {
            setUser(prevUser => ({
                ...prevUser,
                name: editForm.name,
                email: editForm.email,
                username: editForm.username,
            }));
            setIsSaving(false);
            setIsEditing(false);
            toast({
                title: 'Profile Updated',
                description: 'Your profile information has been saved.',
            });
        }, 1500);
    };

    const handleLogout = () => {
        // Simulate logout
        console.log('Logging out...');
        toast({
            title: 'Logged Out',
            description: 'You have been successfully logged out.',
        });
        router.push('/login'); // Redirect to login page
    };

    // Placeholder data - replace with actual user data if authentication is added
    const joinDate = new Date(Date.now() - 1000 * 60 * 60 * 24 * 90); // Joined 90 days ago
    const projectsCount = 5; // Placeholder

    return (
        <div className="container mx-auto p-4 md:p-8">
            <Card className="max-w-3xl mx-auto shadow-lg overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-primary/10 via-background to-primary/10 p-6 md:p-8 relative">
                    <div className="flex flex-col md:flex-row items-center gap-4">
                        <Avatar className="w-24 h-24 md:w-32 md:h-32 border-4 border-background shadow-md hover:scale-105 transition-transform duration-300">
                            <AvatarImage src={user.avatarUrl} alt={user.name} data-ai-hint="professional person portrait" />
                            <AvatarFallback className="text-4xl">
                                {user.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                        </Avatar>
                        <div className="text-center md:text-left flex-1">
                            {!isEditing ? (
                                <>
                                    <CardTitle className="text-3xl font-bold text-primary text-glow-primary">{user.name}</CardTitle>
                                    <CardDescription className="text-lg text-muted-foreground mt-1 flex items-center justify-center md:justify-start gap-2">
                                        <Mail className="w-4 h-4" /> {user.email}
                                    </CardDescription>
                                </>
                            ) : (
                                <div className="space-y-2">
                                    <Input
                                        id="edit-name"
                                        name="name"
                                        value={editForm.name}
                                        onChange={handleInputChange}
                                        placeholder="Your Name"
                                        className="text-3xl font-bold border-0 shadow-none focus-visible:ring-0 focus-visible:border-b focus-visible:border-primary p-0 h-auto"
                                    />
                                    <Input
                                        id="edit-email"
                                        name="email"
                                        type="email"
                                        value={editForm.email}
                                        onChange={handleInputChange}
                                        placeholder="Your Email"
                                        className="text-lg border-0 shadow-none focus-visible:ring-0 focus-visible:border-b focus-visible:border-primary p-0 h-auto text-muted-foreground"
                                    />
                                </div>
                            )}
                            <p className="text-sm text-muted-foreground mt-2">Joined {joinDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                            <p className="text-sm text-muted-foreground">{projectsCount} Projects Created</p>
                        </div>
                         <div className="absolute top-4 right-4 flex gap-2">
                            {isEditing ? (
                                <>
                                    <Button variant="ghost" size="icon" onClick={handleEditToggle} className="text-muted-foreground hover:text-destructive" title="Cancel Edit">
                                        <XCircle className="h-5 w-5" />
                                    </Button>
                                     <Button variant="default" size="sm" onClick={handleSave} disabled={isSaving} className="hover:glow-primary focus-visible:glow-primary" title="Save Changes">
                                         {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                         {isSaving ? 'Saving...' : 'Save'}
                                     </Button>
                                </>
                            ) : (
                                <Button variant="outline" size="sm" onClick={handleEditToggle} className="focus-visible:glow-accent hover:glow-accent" title="Edit Profile">
                                    <Edit3 className="mr-2 h-4 w-4" /> Edit Profile
                                </Button>
                            )}
                         </div>
                    </div>
                </CardHeader>

                <CardContent className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Personal Information & Settings Section */}
                    <div className="space-y-6">
                        <h3 className="text-xl font-semibold text-primary flex items-center gap-2"><User className="w-5 h-5" /> Account Details</h3>
                         {!isEditing ? (
                            <div className="space-y-3 text-sm">
                                <p><strong className="text-foreground">Username:</strong> {user.username}</p>
                                <p><strong className="text-foreground">Email:</strong> {user.email}</p>
                                <Button variant="link" className="p-0 h-auto text-primary hover:underline">Change Password</Button>
                            </div>
                         ) : (
                             <div className="space-y-4 text-sm">
                                <div>
                                     <Label htmlFor="edit-username">Username</Label>
                                     <Input
                                        id="edit-username"
                                        name="username"
                                        value={editForm.username}
                                        onChange={handleInputChange}
                                        placeholder="Username"
                                        className="mt-1 focus-visible:glow-primary"
                                     />
                                </div>
                                <p><strong className="text-foreground">Email:</strong> {editForm.email} (Cannot change email here)</p>
                                <Button variant="link" className="p-0 h-auto text-primary hover:underline">Change Password</Button>
                             </div>
                         )}

                        <Separator />

                        {/* API Keys Section */}
                        <h3 className="text-xl font-semibold text-primary flex items-center gap-2"><ShieldCheck className="w-5 h-5" /> API Keys</h3>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="gemini-api-key">Gemini API Key</Label>
                                <Input
                                    id="gemini-api-key"
                                    type="password"
                                    value={geminiApiKey}
                                    onChange={(e) => setGeminiApiKey(e.target.value)}
                                    placeholder="Enter your Gemini API key"
                                    className="mt-1 focus-visible:glow-primary"
                                />
                            </div>
                            <div>
                                <Label htmlFor="openai-api-key">OpenAI API Key</Label>
                                <Input
                                    id="openai-api-key"
                                    type="password"
                                    value={openaiApiKey}
                                    onChange={(e) => setOpenaiApiKey(e.target.value)}
                                    placeholder="Enter your OpenAI API key"
                                    className="mt-1 focus-visible:glow-primary"
                                />
                            </div>
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
                         <Button variant="destructive" className="w-full mt-4" onClick={handleLogout}>
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
                            <p className="text-sm text-muted-foreground">(Activity feed is currently a placeholder)</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
