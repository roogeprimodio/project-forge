// src/app/register/page.tsx
"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, User, Mail, Lock, Eye, EyeOff, PlayCircle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import Image from 'next/image';

// Placeholder for Lottie animation component
const LottieAnimationPlaceholder = ({ className }: { className?: string }) => (
  <div className={`bg-muted/30 rounded-lg flex items-center justify-center aspect-square ${className}`} data-ai-hint="user registration abstract animation">
    <PlayCircle className="w-24 h-24 text-primary opacity-50" />
    <p className="absolute bottom-4 text-xs text-muted-foreground">Lottie Animation Placeholder</p>
  </div>
);

export default function RegisterPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();
    const { toast } = useToast();

    const handleRegister = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            toast({ variant: "destructive", title: "Registration Error", description: "Passwords do not match." });
            return;
        }
        if (password.length < 8) { // Increased password length
             setError('Password must be at least 8 characters long.');
             toast({ variant: "destructive", title: "Registration Error", description: "Password must be at least 8 characters." });
             return;
        }

        setIsLoading(true);
        console.log('Registration attempt:', { name, email, password });
        // Simulate API call
        setTimeout(() => {
            setIsLoading(false);
            toast({
                title: 'Account Created!',
                description: 'Your account has been successfully created. Please log in.',
            });
            router.push('/login');
        }, 1500);
    };

    return (
         <div className="flex items-center justify-center min-h-screen p-4 bg-gradient-to-br from-primary/10 via-background to-accent/10">
            <Card className="w-full max-w-4xl shadow-2xl grid md:grid-cols-2 overflow-hidden rounded-xl border-primary/20">
                {/* Left Side: Registration Form */}
                <div className="flex flex-col justify-center p-6 sm:p-10 order-last md:order-first">
                    <CardHeader className="text-center p-0 mb-6 sm:mb-8">
                         <Link href="/" className="inline-block mb-4">
                             <Image src="https://picsum.photos/seed/logo/120/40" alt="Project Forge Logo" width={120} height={40} data-ai-hint="modern tech logo" className="mx-auto rounded-md"/>
                         </Link>
                        <CardTitle className="text-2xl sm:text-3xl font-bold text-primary text-glow-primary">Create Your Account</CardTitle>
                        <CardDescription className="text-sm sm:text-base text-muted-foreground mt-1">
                            Join Project Forge and start creating amazing projects.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="p-0">
                        <form onSubmit={handleRegister} className="space-y-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="name" className="flex items-center text-sm font-medium">
                                    <User className="w-4 h-4 mr-2 text-primary/80" /> Full Name
                                </Label>
                                <Input
                                    id="name"
                                    type="text"
                                    placeholder="e.g., Alex Doe"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                    className="focus-visible:glow-primary h-10 text-sm"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="email-register" className="flex items-center text-sm font-medium">
                                    <Mail className="w-4 h-4 mr-2 text-primary/80" /> Email Address
                                </Label>
                                <Input
                                    id="email-register"
                                    type="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="focus-visible:glow-primary h-10 text-sm"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="password-register" className="flex items-center text-sm font-medium">
                                    <Lock className="w-4 h-4 mr-2 text-primary/80" /> Password
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="password-register"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="Minimum 8 characters"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        className={`focus-visible:glow-primary h-10 text-sm pr-10 ${error.includes('Password') || error.includes('match') ? 'border-destructive' : ''}`}
                                        aria-describedby="password-error-register"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-primary"
                                        onClick={() => setShowPassword(!showPassword)}
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="confirmPassword" className="flex items-center text-sm font-medium">
                                    <Lock className="w-4 h-4 mr-2 text-primary/80" /> Confirm Password
                                </Label>
                                 <div className="relative">
                                    <Input
                                        id="confirmPassword"
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        placeholder="Re-enter your password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        className={`focus-visible:glow-primary h-10 text-sm pr-10 ${error.includes('match') ? 'border-destructive' : ''}`}
                                        aria-describedby="password-error-register"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-primary"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                                    >
                                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </div>

                            {error && <p id="password-error-register" className="text-xs text-destructive text-center py-1">{error}</p>}
                             <p className="text-xs text-muted-foreground">By signing up, you agree to our <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>.</p>

                            <Button type="submit" className="w-full hover:glow-primary focus-visible:glow-primary h-10 text-sm font-semibold" disabled={isLoading}>
                                {isLoading ? (
                                    <> <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating Account... </>
                                 ) : (
                                    <> <UserPlus className="mr-2 h-4 w-4" /> Sign Up </>
                                 )}
                            </Button>
                        </form>
                    </CardContent>
                    
                    <div className="my-6">
                        <Separator />
                        <p className="text-center text-xs text-muted-foreground bg-background px-2 relative -top-2.5 mx-auto w-fit">OR SIGN UP WITH</p>
                    </div>

                    <div className="space-y-3">
                        {/* Placeholder Social Login Buttons */}
                        <Button variant="outline" className="w-full h-10 text-sm hover:border-primary hover:text-primary focus-visible:glow-accent">
                             <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /><path d="M1 1h22v22H1z" fill="none" /></svg>
                            Sign up with Google
                        </Button>
                         <Button variant="outline" className="w-full h-10 text-sm hover:border-primary hover:text-primary focus-visible:glow-accent">
                            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.91 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                            Sign up with GitHub
                        </Button>
                    </div>
                    
                    <CardFooter className="p-0 mt-6 sm:mt-8 text-center">
                        <p className="text-xs text-muted-foreground w-full">
                            Already have an account?{' '}
                            <Link href="/login" className="font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-sm">
                                Log In
                            </Link>
                        </p>
                    </CardFooter>
                </div>

                 {/* Right Side: Lottie Animation / Branding (Hidden on small screens) */}
                 <div className="hidden md:flex flex-col items-center justify-center bg-accent p-8 text-accent-foreground order-first md:order-last">
                    <UserPlus className="w-20 h-20 mb-6" />
                    <h2 className="text-3xl font-bold mb-3 text-center">Join Our Community</h2>
                    <p className="text-center text-accent-foreground/80 mb-8">
                        Unlock powerful AI tools and collaborate seamlessly on your projects.
                    </p>
                    <LottieAnimationPlaceholder className="w-full max-w-xs" />
                     <p className="text-xs mt-8 text-accent-foreground/60">
                        Project Forge &copy; {new Date().getFullYear()}
                    </p>
                </div>
            </Card>
        </div>
    );
}
