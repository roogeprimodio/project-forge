
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
import { UserPlus, User, Mail, Lock } from 'lucide-react';

export default function RegisterPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();
    const { toast } = useToast();

    const handleRegister = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        if (password.length < 6) {
             setError('Password must be at least 6 characters long.');
             return;
        }

        setIsLoading(true);
        console.log('Registration attempt:', { name, email, password });
        setTimeout(() => {
            setIsLoading(false);
            toast({
                title: 'Registration Successful',
                description: 'You can now log in.',
            });
            router.push('/login');
        }, 1500);
    };

    return (
        <Card className="w-full max-w-sm sm:max-w-md shadow-2xl mx-4 sm:mx-0">
            <CardHeader className="text-center p-4 sm:p-6">
                 <UserPlus className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-primary mb-2" />
                <CardTitle className="text-xl sm:text-2xl text-glow-primary">Create Account</CardTitle>
                <CardDescription className="text-sm sm:text-base">Join Project Forge to start creating.</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
                <form onSubmit={handleRegister} className="space-y-3 sm:space-y-5">
                    <div className="space-y-1 sm:space-y-2">
                        <Label htmlFor="name" className="flex items-center gap-2 text-sm">
                            <User className="w-4 h-4" /> Name
                        </Label>
                        <Input
                            id="name"
                            type="text"
                            placeholder="Your Name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                             className="focus-visible:glow-primary h-9 sm:h-10"
                        />
                    </div>
                    <div className="space-y-1 sm:space-y-2">
                        <Label htmlFor="email" className="flex items-center gap-2 text-sm">
                            <Mail className="w-4 h-4" /> Email
                        </Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="focus-visible:glow-primary h-9 sm:h-10"
                        />
                    </div>
                    <div className="space-y-1 sm:space-y-2">
                        <Label htmlFor="password" className="flex items-center gap-2 text-sm">
                            <Lock className="w-4 h-4" /> Password
                        </Label>
                        <Input
                            id="password"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            aria-describedby="password-error"
                            className={`focus-visible:glow-primary h-9 sm:h-10 ${error.includes('Password') || error.includes('match') ? 'border-destructive' : ''}`}
                        />
                    </div>
                    <div className="space-y-1 sm:space-y-2">
                         <Label htmlFor="confirmPassword" className="flex items-center gap-2 text-sm">
                            <Lock className="w-4 h-4" /> Confirm Password
                        </Label>
                        <Input
                            id="confirmPassword"
                            type="password"
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            aria-describedby="password-error"
                             className={`focus-visible:glow-primary h-9 sm:h-10 ${error.includes('match') ? 'border-destructive' : ''}`}
                        />
                    </div>

                    {error && <p id="password-error" className="text-xs sm:text-sm text-destructive text-center">{error}</p>}

                    <Button type="submit" className="w-full hover:glow-primary focus-visible:glow-primary h-9 sm:h-10 text-sm sm:text-base" disabled={isLoading}>
                         {isLoading ? 'Creating Account...' : 'Sign Up'}
                    </Button>
                </form>
            </CardContent>
            <CardFooter className="flex justify-center text-xs sm:text-sm p-4 sm:p-6">
                <p className="text-muted-foreground">
                    Already have an account?{' '}
                    <Link href="/login" className="text-primary hover:underline focus-visible:glow-accent">
                        Log In
                    </Link>
                </p>
            </CardFooter>
        </Card>
    );
}
