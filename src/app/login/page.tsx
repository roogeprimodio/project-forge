// src/app/login/page.tsx
"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { LogIn, Mail, Lock } from 'lucide-react';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const { toast } = useToast();

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        // Simulate API call
        console.log('Login attempt:', { email, password });
        setTimeout(() => {
            setIsLoading(false);
            // Simulate successful login
            toast({
                title: 'Login Successful',
                description: 'Redirecting to dashboard...',
            });
            router.push('/'); // Redirect to dashboard after "login"
        }, 1500);
    };

    return (
        <Card className="w-full max-w-md shadow-2xl">
            <CardHeader className="text-center">
                <LogIn className="w-12 h-12 mx-auto text-primary mb-2" />
                <CardTitle className="text-2xl text-glow-primary">Welcome Back!</CardTitle>
                <CardDescription>Log in to access your projects.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="email" className="flex items-center gap-2">
                            <Mail className="w-4 h-4" /> Email
                        </Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="focus-visible:glow-primary"
                        />
                    </div>
                    <div className="space-y-2">
                         <Label htmlFor="password" className="flex items-center gap-2">
                             <Lock className="w-4 h-4" /> Password
                        </Label>
                        <Input
                            id="password"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="focus-visible:glow-primary"
                        />
                    </div>
                     <Button type="submit" className="w-full hover:glow-primary focus-visible:glow-primary" disabled={isLoading}>
                        {isLoading ? 'Logging in...' : 'Log In'}
                     </Button>
                </form>
            </CardContent>
            <CardFooter className="flex flex-col items-center text-sm">
                <p className="text-muted-foreground">
                    Don&apos;t have an account?{' '}
                    <Link href="/register" className="text-primary hover:underline focus-visible:glow-accent">
                        Sign Up
                    </Link>
                </p>
                <Link href="#" className="text-xs text-muted-foreground hover:underline mt-2">
                    Forgot Password?
                 </Link>
            </CardFooter>
        </Card>
    );
}
