
// src/app/profile/page.tsx
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { User, Mail, Bell, Palette, ShieldCheck, Activity, Edit3, Save, XCircle, Loader2, KeyRound, Eye, EyeOff, GraduationCap, UploadCloud, Trash2, Info, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";


interface UserProfile {
    name: string;
    email: string;
    avatarUrl?: string;
    username: string;
    degree?: string;
    branch?: string;
    instituteName?: string;
    universityName?: string;
    semester?: string;
    submissionYear?: string;
}

const DEFAULT_AVATAR_PLACEHOLDER_TEXT = "U";

export default function ProfilePage() {
    const router = useRouter();
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [user, setUser] = useLocalStorage<UserProfile>('userProfileData', {
        name: '',
        email: '',
        avatarUrl: undefined,
        username: '',
        degree: '',
        branch: '',
        instituteName: '',
        universityName: '',
        semester: '',
        submissionYear: '',
    });

    const [geminiApiKey, setGeminiApiKey] = useLocalStorage<string>('geminiApiKey', '');
    const [openaiApiKey, setOpenaiApiKey] = useLocalStorage<string>('openaiApiKey', '');

    const [isGeminiKeyEnabled, setIsGeminiKeyEnabled] = useLocalStorage<boolean>('isGeminiKeyEnabled', true);
    const [isOpenAiKeyEnabled, setIsOpenAiKeyEnabled] = useLocalStorage<boolean>('isOpenAiKeyEnabled', false);

    const [showGeminiKey, setShowGeminiKey] = useState(false);
    const [showOpenAiKey, setShowOpenAiKey] = useState(false);

    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<UserProfile>(user);
    const [isSaving, setIsSaving] = useState(false);
    const [imagePreview, setImagePreview] = useState<string | undefined>(user.avatarUrl);

    useEffect(() => {
        if (!isEditing) {
            setEditForm(user);
            setImagePreview(user.avatarUrl);
        }
    }, [user, isEditing]);

    const getAvatarFallback = (name?: string) => {
        if (!name?.trim()) return DEFAULT_AVATAR_PLACEHOLDER_TEXT;
        const initials = name.split(' ').map(n => n[0]).join('').toUpperCase();
        return initials.substring(0, 2) || DEFAULT_AVATAR_PLACEHOLDER_TEXT;
    }

    const handleEditToggle = () => {
        if (!isEditing) {
            setEditForm(user);
            setImagePreview(user.avatarUrl);
        }
        setIsEditing(!isEditing);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setEditForm(prev => ({ ...prev, [name]: value }));
    };

    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                toast({ variant: 'destructive', title: 'Invalid File', description: 'Please select an image file.' });
                return;
            }
            if (file.size > 2 * 1024 * 1024) { // 2MB limit
                toast({ variant: 'destructive', title: 'File Too Large', description: 'Image size should be less than 2MB.' });
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                setImagePreview(result);
                setEditForm(prev => ({ ...prev, avatarUrl: result }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveImage = () => {
        setImagePreview(undefined);
        setEditForm(prev => ({ ...prev, avatarUrl: undefined }));
    };

    const handleSave = () => {
        setIsSaving(true);
        setTimeout(() => {
            const profileToSave: UserProfile = { ...editForm, avatarUrl: imagePreview };
            setUser(profileToSave);
            setIsSaving(false);
            setIsEditing(false);
            toast({
                title: 'Profile Updated',
                description: 'Your profile information has been saved locally.',
            });
        }, 1500);
    };

    const currentAvatarSrc = imagePreview || `https://placehold.co/200x200.png?text=${getAvatarFallback(editForm.name || user.name)}`;

    return (
        <div className="container mx-auto p-2 sm:p-4 md:p-8">
            <Card className="max-w-3xl mx-auto shadow-lg overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-primary/10 via-background to-primary/10 p-4 sm:p-6 md:p-8 relative">
                    <div className="flex flex-col items-center text-center sm:flex-row sm:items-center sm:text-left gap-3 sm:gap-4">
                        <div className="relative group">
                            <Avatar className="w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 border-4 border-background shadow-md hover:scale-105 transition-transform duration-300 cursor-pointer"
                                onClick={() => isEditing && fileInputRef.current?.click()}
                            >
                                <AvatarImage src={currentAvatarSrc} alt={editForm.name || "User Avatar"} data-ai-hint="professional person portrait" />
                                <AvatarFallback className="text-3xl sm:text-4xl">
                                    {getAvatarFallback(editForm.name || user.name)}
                                </AvatarFallback>
                            </Avatar>
                            {isEditing && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full cursor-pointer"
                                     onClick={() => fileInputRef.current?.click()}
                                >
                                    <UploadCloud className="w-8 h-8 text-white" />
                                </div>
                            )}
                        </div>
                        <Input
                            type="file"
                            accept="image/*"
                            ref={fileInputRef}
                            className="hidden"
                            onChange={handleImageUpload}
                            disabled={!isEditing}
                        />

                        <div className="flex-1">
                            {!isEditing ? (
                                <>
                                    <CardTitle className="text-2xl sm:text-3xl font-bold text-primary text-glow-primary">{user.name || "Enter Name"}</CardTitle>
                                    <CardDescription className="text-base sm:text-lg text-muted-foreground mt-1 flex items-center justify-center sm:justify-start gap-2">
                                        <Mail className="w-4 h-4" /> {user.email || "Enter Email"}
                                    </CardDescription>
                                </>
                            ) : (
                                <div className="space-y-2">
                                    <Input
                                        id="edit-name"
                                        name="name"
                                        value={editForm.name}
                                        onChange={handleInputChange}
                                        placeholder="Enter Full Name"
                                        className="text-2xl sm:text-3xl font-bold border-0 shadow-none focus-visible:ring-0 focus-visible:border-b focus-visible:border-primary p-0 h-auto"
                                    />
                                    <Input
                                        id="edit-email"
                                        name="email"
                                        type="email"
                                        value={editForm.email}
                                        onChange={handleInputChange}
                                        placeholder="Enter Email Address"
                                        className="text-base sm:text-lg border-0 shadow-none focus-visible:ring-0 focus-visible:border-b focus-visible:border-primary p-0 h-auto text-muted-foreground"
                                    />
                                </div>
                            )}
                             {isEditing && imagePreview && (
                                <Button variant="link" size="sm" onClick={handleRemoveImage} className="text-xs text-destructive p-0 h-auto mt-1">
                                    <Trash2 className="w-3 h-3 mr-1" /> Remove Photo
                                </Button>
                            )}
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
                                <p><strong className="text-foreground">Username:</strong> {user.username || "Not set"}</p>
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
                                        placeholder="Enter Username"
                                        className="mt-1 focus-visible:glow-primary h-9"
                                     />
                                </div>
                             </div>
                         )}

                        <Separator />
                        <h3 className="text-lg sm:text-xl font-semibold text-primary flex items-center gap-2"><GraduationCap className="w-5 h-5" /> Educational Information</h3>
                        {!isEditing ? (
                            <div className="space-y-2 text-sm">
                                <p><strong className="text-foreground">Degree:</strong> {user.degree || "Not set"}</p>
                                <p><strong className="text-foreground">Branch:</strong> {user.branch || "Not set"}</p>
                                <p><strong className="text-foreground">Institute:</strong> {user.instituteName || "Not set"}</p>
                                <p><strong className="text-foreground">University:</strong> {user.universityName || "Not set"}</p>
                                <p><strong className="text-foreground">Semester:</strong> {user.semester || "Not set"}</p>
                                <p><strong className="text-foreground">Academic/Graduation Year:</strong> {user.submissionYear || "Not set"}</p>
                            </div>
                        ) : (
                            <div className="space-y-3 text-sm">
                                <div><Label htmlFor="edit-degree">Degree</Label><Input id="edit-degree" name="degree" value={editForm.degree || ''} onChange={handleInputChange} placeholder="e.g., Bachelor of Engineering" className="mt-1 focus-visible:glow-primary h-9"/></div>
                                <div><Label htmlFor="edit-branch">Branch</Label><Input id="edit-branch" name="branch" value={editForm.branch || ''} onChange={handleInputChange} placeholder="e.g., Computer Engineering" className="mt-1 focus-visible:glow-primary h-9"/></div>
                                <div><Label htmlFor="edit-instituteName">Institute Name</Label><Input id="edit-instituteName" name="instituteName" value={editForm.instituteName || ''} onChange={handleInputChange} placeholder="e.g., XYZ College of Engineering" className="mt-1 focus-visible:glow-primary h-9"/></div>
                                <div><Label htmlFor="edit-universityName">University Name</Label><Input id="edit-universityName" name="universityName" value={editForm.universityName || ''} onChange={handleInputChange} placeholder="e.g., ABC University" className="mt-1 focus-visible:glow-primary h-9"/></div>
                                <div><Label htmlFor="edit-semester">Current Semester</Label><Input id="edit-semester" name="semester" type="number" value={editForm.semester || ''} onChange={handleInputChange} placeholder="e.g., 5" className="mt-1 focus-visible:glow-primary h-9"/></div>
                                <div><Label htmlFor="edit-submissionYear">Academic/Graduation Year</Label><Input id="edit-submissionYear" name="submissionYear" value={editForm.submissionYear || ''} onChange={handleInputChange} placeholder="e.g., 2024 or 2023-2024" className="mt-1 focus-visible:glow-primary h-9"/></div>
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
                                <div className="relative">
                                    <Input
                                        id="gemini-api-key"
                                        type={showGeminiKey ? 'text' : 'password'}
                                        value={geminiApiKey}
                                        onChange={(e) => setGeminiApiKey(e.target.value)}
                                        placeholder="Enter Gemini API key"
                                        className="mt-1 focus-visible:glow-primary h-9 pr-10"
                                        autoComplete="off"
                                        disabled={!isGeminiKeyEnabled}
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-primary"
                                        onClick={() => setShowGeminiKey(!showGeminiKey)}
                                        aria-label={showGeminiKey ? "Hide Gemini API key" : "Show Gemini API key"}
                                        disabled={!isGeminiKeyEnabled}
                                    >
                                        {showGeminiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </Button>
                                </div>
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
                                <div className="relative">
                                    <Input
                                        id="openai-api-key"
                                        type={showOpenAiKey ? 'text' : 'password'}
                                        value={openaiApiKey}
                                        onChange={(e) => setOpenaiApiKey(e.target.value)}
                                        placeholder="Enter OpenAI API key"
                                        className="mt-1 focus-visible:glow-primary h-9 pr-10"
                                        autoComplete="off"
                                        disabled={!isOpenAiKeyEnabled}
                                    />
                                     <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-primary"
                                        onClick={() => setShowOpenAiKey(!showOpenAiKey)}
                                        aria-label={showOpenAiKey ? "Hide OpenAI API key" : "Show OpenAI API key"}
                                        disabled={!isOpenAiKeyEnabled}
                                    >
                                        {showOpenAiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </div>
                             <Accordion type="single" collapsible className="w-full">
                                <AccordionItem value="api-key-guide">
                                    <AccordionTrigger className="text-xs text-muted-foreground hover:text-primary py-2">
                                        <Info className="h-3.5 w-3.5 mr-1"/> How to get API Keys?
                                    </AccordionTrigger>
                                    <AccordionContent className="text-xs space-y-2 pt-2 pb-1 text-muted-foreground">
                                        <p>API keys allow this application to use AI models on your behalf. You are responsible for any costs incurred.</p>
                                        <div>
                                            <strong className="text-foreground">Google Gemini:</strong>
                                            <ol className="list-decimal list-inside pl-2 space-y-0.5">
                                                <li>Go to <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google AI Studio <ExternalLink className="inline h-3 w-3"/></a>.</li>
                                                <li>Sign in and create a new API key.</li>
                                                <li>Ensure the "Generative Language API" or "Vertex AI API" is enabled in your Google Cloud Project.</li>
                                            </ol>
                                        </div>
                                        <div>
                                            <strong className="text-foreground">OpenAI (for ChatGPT models):</strong>
                                            <ol className="list-decimal list-inside pl-2 space-y-0.5">
                                                <li>Go to <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">OpenAI API Keys page <ExternalLink className="inline h-3 w-3"/></a>.</li>
                                                <li>Sign in and create a new secret key.</li>
                                                <li>Set up billing if you plan to exceed free tier limits.</li>
                                            </ol>
                                        </div>
                                        <p className="font-semibold text-destructive">Note: Keys are stored locally in your browser. Do not use on shared computers.</p>
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                        </div>

                    </div>

                    <div className="space-y-4 md:space-y-6">
                        <h3 className="text-lg sm:text-xl font-semibold text-primary flex items-center gap-2"><Palette className="w-5 h-5" /> Preferences</h3>
                        <div className="space-y-2 text-sm">
                            <p><strong className="text-foreground">Theme:</strong> (Toggle in main sidebar)</p>
                            <p><strong className="text-foreground">Language:</strong> English (US) (Not configurable yet)</p>
                        </div>
                        <Separator/>
                        <h3 className="text-lg sm:text-xl font-semibold text-primary flex items-center gap-2"><Bell className="w-5 h-5" /> Notifications</h3>
                        <div className="space-y-2 text-sm text-muted-foreground">
                            <p>Manage notification preferences (e.g., email updates). (Not implemented)</p>
                        </div>
                        <Separator/>
                        <h3 className="text-lg sm:text-xl font-semibold text-primary flex items-center gap-2"><ShieldCheck className="w-5 h-5" /> Security</h3>
                        <div className="space-y-2 text-sm text-muted-foreground">
                            <p>Review login activity. (Not implemented)</p>
                        </div>
                        <Separator />
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
