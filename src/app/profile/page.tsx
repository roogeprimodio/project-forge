// src/app/profile/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch'; // Import Switch
import { useToast } from '@/hooks/use-toast';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { User, Mail, Bell, Palette, ShieldCheck, Activity, Edit3, LogOut, Save, XCircle, Loader2, KeyRound } from 'lucide-react'; // Added KeyRound
import { cn } from '@/lib/utils';

export default function ProfilePage() {
    const router = useRouter();
    const { toast } = useToast();

    const [user, setUser] = useState({
        name: 'Alex Doe',
        email: 'alex.doe@example.com',
        avatarUrl: 'https://picsum.photos/id/237/200/200',
        username: 'alex_doe',
    });

    const [geminiApiKey, setGeminiApiKey] = useLocalStorage<string>('geminiApiKey', '');
    const [openaiApiKey, setOpenaiApiKey] = useLocalStorage<string>('openaiApiKey', '');
    
    // State for API key toggles
    const [isGeminiKeyEnabled, setIsGeminiKeyEnabled] = useLocalStorage<boolean>('isGeminiKeyEnabled', true);
    const [isOpenAiKeyEnabled, setIsOpenAiKeyEnabled] = useLocalStorage<boolean>('isOpenAiKeyEnabled', false);


    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({ name: '', email: '', username: '' });
    const [isSaving, setIsSaving] = useState(false);

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
        console.log('Saving profile:', editForm);
        console.log('Saving API keys (local storage):', { geminiApiKey: '...', openaiApiKey: '...' });
        console.log('API Key Enabled States:', { isGeminiKeyEnabled, isOpenAiKeyEnabled }); // Log toggle states
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
                description: 'Your profile information and API key settings have been saved locally.',
            });
        }, 1500);
    };

    const handleLogout = () => {
        console.log('Logging out...');
        toast({
            title: 'Logged Out',
            description: 'You have been successfully logged out.',
        });
        router.push('/login');
    };

    const joinDate = new Date(Date.now() - 1000 * 60 * 60 * 24 * 90);
    const projectsCount = 5; // Placeholder

    return (
        <div className="container mx-auto p-2 sm:p-4 md:p-8">
            <Card className="max-w-3xl mx-auto shadow-lg overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-primary/10 via-background to-primary/10 p-4 sm:p-6 md:p-8 relative">
                    <div className="flex flex-col items-center text-center sm:flex-row sm:items-center sm:text-left gap-3 sm:gap-4">
                        <Avatar className="w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 border-4 border-background shadow-md hover:scale-105 transition-transform duration-300">
                            <AvatarImage src={user.avatarUrl} alt={user.name} data-ai-hint="professional person portrait" />
                            <AvatarFallback className="text-3xl sm:text-4xl">
                                {user.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                            {!isEditing ? (
                                <>
                                    <CardTitle className="text-2xl sm:text-3xl font-bold text-primary text-glow-primary">{user.name}</CardTitle>
                                    <CardDescription className="text-base sm:text-lg text-muted-foreground mt-1 flex items-center justify-center sm:justify-start gap-2">
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
                                        className="text-2xl sm:text-3xl font-bold border-0 shadow-none focus-visible:ring-0 focus-visible:border-b focus-visible:border-primary p-0 h-auto"
                                    />
                                    <Input
                                        id="edit-email"
                                        name="email"
                                        type="email"
                                        value={editForm.email}
                                        onChange={handleInputChange}
                                        placeholder="Your Email"
                                        className="text-base sm:text-lg border-0 shadow-none focus-visible:ring-0 focus-visible:border-b focus-visible:border-primary p-0 h-auto text-muted-foreground"
                                    />
                                </div>
                            )}
                            <p className="text-xs sm:text-sm text-muted-foreground mt-2">Joined {joinDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                            <p className="text-xs sm:text-sm text-muted-foreground">{projectsCount} Projects Created</p>
                        </div>
                         <div className={cn(
                             "flex gap-2 mt-3 sm:mt-0",
                             "sm:absolute sm:top-4 sm:right-4"
                         )}>
                            {isEditing ? (
                                <>
                                    <Button variant="ghost" size="icon" onClick={handleEditToggle} className="text-muted-foreground hover:text-destructive h-8 w-8 sm:h-auto sm:w-auto sm:px-3" title="Cancel Edit">
                                        <XCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                                        <span className="sm:hidden ml-1 text-xs">Cancel</span>
                                    </Button>
                                     <Button variant="default" size="sm" onClick={handleSave} disabled={isSaving} className="hover:glow-primary focus-visible:glow-primary h-8 sm:h-auto" title="Save Changes">
                                         {isSaving ? <Loader2 className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" /> : <Save className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />}
                                         {isSaving ? 'Saving...' : 'Save'}
                                     </Button>
                                </>
                            ) : (
                                <Button variant="outline" size="sm" onClick={handleEditToggle} className="focus-visible:glow-accent hover:glow-accent h-8 sm:h-auto" title="Edit Profile">
                                    <Edit3 className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" /> Edit Profile
                                </Button>
                            )}
                         </div>
                    </div>
                </CardHeader>

                <CardContent className="p-4 sm:p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                    <div className="space-y-4 md:space-y-6">
                        <h3 className="text-lg sm:text-xl font-semibold text-primary flex items-center gap-2"><User className="w-5 h-5" /> Account Details</h3>
                         {!isEditing ? (
                            <div className="space-y-2 text-sm">
                                <p><strong className="text-foreground">Username:</strong> {user.username}</p>
                                <p><strong className="text-foreground">Email:</strong> {user.email}</p>
                                <Button variant="link" className="p-0 h-auto text-primary hover:underline text-sm">Change Password</Button>
                            </div>
                         ) : (
                             <div className="space-y-3 text-sm">
                                <div>
                                     <Label htmlFor="edit-username">Username</Label>
                                     <Input
                                        id="edit-username"
                                        name="username"
                                        value={editForm.username}
                                        onChange={handleInputChange}
                                        placeholder="Username"
                                        className="mt-1 focus-visible:glow-primary h-9"
                                     />
                                </div>
                                <p><strong className="text-foreground">Email:</strong> {editForm.email} (Cannot change)</p>
                                <Button variant="link" className="p-0 h-auto text-primary hover:underline text-sm">Change Password</Button>
                             </div>
                         )}

                        <Separator />

                        <h3 className="text-lg sm:text-xl font-semibold text-primary flex items-center gap-2"><KeyRound className="w-5 h-5" /> API Key Management (Local)</h3>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="gemini-api-key" className="text-sm">Google Gemini API Key</Label>
                                    <Switch
                                        id="gemini-key-toggle"
                                        checked={isGeminiKeyEnabled}
                                        onCheckedChange={setIsGeminiKeyEnabled}
                                        aria-label="Enable Google Gemini API Key"
                                    />
                                </div>
                                <Input
                                    id="gemini-api-key"
                                    type="password"
                                    value={geminiApiKey}
                                    onChange={(e) => setGeminiApiKey(e.target.value)}
                                    placeholder="Enter Gemini API key"
                                    className="mt-1 focus-visible:glow-primary h-9"
                                    autoComplete="off"
                                    disabled={!isGeminiKeyEnabled}
                                />
                                <p className="text-xs text-muted-foreground mt-1">Optional. Used for AI features if enabled.</p>
                            </div>
                            <div className="space-y-2">
                                 <div className="flex items-center justify-between">
                                    <Label htmlFor="openai-api-key" className="text-sm">OpenAI API Key</Label>
                                     <Switch
                                        id="openai-key-toggle"
                                        checked={isOpenAiKeyEnabled}
                                        onCheckedChange={setIsOpenAiKeyEnabled}
                                        aria-label="Enable OpenAI API Key"
                                    />
                                </div>
                                <Input
                                    id="openai-api-key"
                                    type="password"
                                    value={openaiApiKey}
                                    onChange={(e) => setOpenaiApiKey(e.target.value)}
                                    placeholder="Enter OpenAI API key"
                                    className="mt-1 focus-visible:glow-primary h-9"
                                    autoComplete="off"
                                    disabled={!isOpenAiKeyEnabled}
                                />
                                <p className="text-xs text-muted-foreground mt-1">Optional. Used for AI features if enabled.</p>
                            </div>
                             <p className="text-xs text-destructive">Note: Keys are stored locally in your browser. Do not use on shared computers.</p>
                        </div>


                        <Separator />

                        <h3 className="text-lg sm:text-xl font-semibold text-primary flex items-center gap-2"><Palette className="w-5 h-5" /> Preferences</h3>
                        <div className="space-y-2 text-sm">
                            <p><strong className="text-foreground">Theme:</strong> (Toggle in sidebar)</p>
                            <p><strong className="text-foreground">Language:</strong> English (US)</p>
                        </div>

                        <Separator />

                        <h3 className="text-lg sm:text-xl font-semibold text-primary flex items-center gap-2"><Bell className="w-5 h-5" /> Notifications</h3>
                        <div className="space-y-2 text-sm text-muted-foreground">
                            <p>Manage notification preferences (e.g., email updates).</p>
                        </div>

                        <Separator />

                        <h3 className="text-lg sm:text-xl font-semibold text-primary flex items-center gap-2"><ShieldCheck className="w-5 h-5" /> Security</h3>
                        <div className="space-y-2 text-sm text-muted-foreground">
                            <p>Review login activity.</p>
                            <Button variant="link" className="p-0 h-auto text-primary hover:underline text-sm">View Login History</Button>
                        </div>

                        <Separator />
                         <Button variant="destructive" className="w-full mt-3 sm:mt-4" onClick={handleLogout}>
                            <LogOut className="mr-2 h-4 w-4" /> Log Out
                         </Button>
                    </div>

                    <div className="space-y-4 md:space-y-6">
                        <h3 className="text-lg sm:text-xl font-semibold text-primary flex items-center gap-2"><Activity className="w-5 h-5" /> Recent Activity</h3>
                        <div className="space-y-3 text-sm p-3 sm:p-4 border rounded-md bg-muted/30 min-h-[150px] sm:min-h-[200px] flex flex-col justify-center items-center">
                            <p className="text-muted-foreground">Recent project activities appear here.</p>
                            <p className="text-xs text-muted-foreground">(Placeholder)</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
