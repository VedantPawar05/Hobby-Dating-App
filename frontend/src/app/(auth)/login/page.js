'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext.js';
import Button from '../../../components/common/Button.js';
import Input from '../../../components/common/Input.js';
import LoadingState from '../../../components/common/LoadingState.js';
import { AlertCircle, Lock } from 'lucide-react';

function LoginForm() {
  const { login, isAuthenticated } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/events';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // If already authenticated, redirect immediately
  useEffect(() => {
    if (isAuthenticated) {
      router.replace(redirectUrl);
    }
  }, [isAuthenticated, redirectUrl, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      await login(email, password);
      router.replace(redirectUrl);
    } catch (err) {
      setErrorMessage(
        err.message || 'Invalid email or password. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md bg-white border border-surface-200 rounded-2xl p-8 shadow-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-brand-50 text-brand-700 rounded-2xl flex items-center justify-center mx-auto mb-3 font-bold text-lg">
            <Lock className="w-5 h-5 text-brand-700" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-surface-900">
            Welcome Back
          </h1>
          <p className="text-sm text-surface-600">
            Log in to discover activities and manage your bookings.
          </p>
        </div>

        {errorMessage && (
          <div className="p-3.5 bg-red-50 border border-red-200 text-red-800 rounded-xl text-sm flex items-start">
            <AlertCircle className="w-4 h-4 mr-2 text-red-600 mt-0.5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email Address"
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            label="Password"
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Button
            type="submit"
            variant="primary"
            loading={loading}
            className="w-full py-2.5 mt-2"
          >
            Sign In to Ricoz
          </Button>
        </form>

        <div className="pt-4 border-t border-surface-100 text-center text-xs text-surface-600">
          Not a member yet?{' '}
          <Link
            href="/register"
            className="font-semibold text-brand-700 hover:text-brand-800 transition-colors"
          >
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingState message="Loading login form..." />}>
      <LoginForm />
    </Suspense>
  );
}
