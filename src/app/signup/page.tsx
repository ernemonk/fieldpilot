'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { UserRole } from '@/lib/types';

export default function SignUpPage() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [role, setRole] = useState<UserRole>('owner');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [useGoogleSignUp, setUseGoogleSignUp] = useState(false);

  const { signUp, signUpWithGoogle, firebaseUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const hasRedirected = useRef(false);

  useEffect(() => {
    // Only redirect once after auth has finished loading
    if (!authLoading && firebaseUser && !hasRedirected.current) {
      hasRedirected.current = true;
      router.replace('/dashboard');
    }
  }, [firebaseUser, authLoading, router]);

  // Show nothing while auth is initializing or user is already logged in
  if (authLoading || firebaseUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
          <p className="mt-4 text-[#6B7280]">Loading...</p>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!tenantId.trim()) {
      setError('Company/Tenant ID is required');
      setLoading(false);
      return;
    }

    try {
      const tid = tenantId.toLowerCase().replace(/[^a-z0-9-]/g, '-');
      await signUp(email, password, displayName, tid, role);
      // Don't navigate here - useEffect will handle it when user state updates
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create account';
      setError(message.replace('Firebase: ', '').replace(/\(auth\/.*\)/, '').trim());
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignUp(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!tenantId.trim()) {
      setError('Company/Tenant ID is required');
      return;
    }

    setLoading(true);
    try {
      const tid = tenantId.toLowerCase().replace(/[^a-z0-9-]/g, '-');
      await signUpWithGoogle(tid, role);
      // Don't navigate here - useEffect will handle it when user state updates
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create account with Google';
      setError(message.replace('Firebase: ', '').replace(/\(auth\/.*\)/, '').trim());
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16 bg-[#F8FAFC]">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#111827] mb-2">Create your account</h1>
          <p className="text-sm text-[#6B7280]">Get started with Field Pilot</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 text-sm">
            {error}
          </div>
        )}

        {!useGoogleSignUp ? (
          <>
            {/* Email/Password Signup Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="displayName" className="block text-xs uppercase tracking-widest font-semibold text-[#6B7280] mb-2">
                  Full Name
                </label>
                <input
                  id="displayName"
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full border border-[#E5E7EB] px-4 py-3 text-sm text-[#111827] focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 transition-colors bg-white"
                  placeholder="John Smith"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-xs uppercase tracking-widest font-semibold text-[#6B7280] mb-2">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-[#E5E7EB] px-4 py-3 text-sm text-[#111827] focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 transition-colors bg-white"
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-xs uppercase tracking-widest font-semibold text-[#6B7280] mb-2">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-[#E5E7EB] px-4 py-3 text-sm text-[#111827] focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 transition-colors bg-white"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label htmlFor="tenantId" className="block text-xs uppercase tracking-widest font-semibold text-[#6B7280] mb-2">
                  Company / Tenant ID
                </label>
                <input
                  id="tenantId"
                  type="text"
                  required
                  value={tenantId}
                  onChange={(e) => setTenantId(e.target.value)}
                  className="w-full border border-[#E5E7EB] px-4 py-3 text-sm text-[#111827] focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 transition-colors bg-white"
                  placeholder="my-company"
                />
              </div>

              <div>
                <label htmlFor="role" className="block text-xs uppercase tracking-widest font-semibold text-[#6B7280] mb-2">
                  Role
                </label>
                <select
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full border border-[#E5E7EB] px-4 py-3 text-sm text-[#111827] focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 transition-colors bg-white"
                >
                  <option value="owner">Owner</option>
                  <option value="admin">Admin</option>
                  <option value="operator">Operator</option>
                  <option value="client">Client</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-teal-600 text-white py-3 text-sm uppercase tracking-widest font-semibold hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating account...' : 'Create Account'}
              </button>
            </form>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#E5E7EB]"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase tracking-widest">
                <span className="bg-[#F8FAFC] px-4 font-semibold text-[#6B7280]">or</span>
              </div>
            </div>

            <button
              onClick={() => setUseGoogleSignUp(true)}
              className="w-full border border-[#E5E7EB] py-3 text-sm flex items-center justify-center gap-3 hover:bg-[#F9FAFB] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-[#111827]"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Sign up with Google
            </button>
          </>
        ) : (
          <>
            <form onSubmit={handleGoogleSignUp} className="space-y-5">
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-sm text-blue-700">
                You'll use your Gmail account to sign up. Just provide your company details below.
              </div>

              <div>
                <label htmlFor="tenantId" className="block text-xs uppercase tracking-widest font-semibold text-[#6B7280] mb-2">
                  Company / Tenant ID
                </label>
                <input
                  id="tenantId"
                  type="text"
                  required
                  value={tenantId}
                  onChange={(e) => setTenantId(e.target.value)}
                  className="w-full border border-[#E5E7EB] px-4 py-3 text-sm text-[#111827] focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 transition-colors bg-white"
                  placeholder="my-company"
                />
              </div>

              <div>
                <label htmlFor="role" className="block text-xs uppercase tracking-widest font-semibold text-[#6B7280] mb-2">
                  Role
                </label>
                <select
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full border border-[#E5E7EB] px-4 py-3 text-sm text-[#111827] focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 transition-colors bg-white"
                >
                  <option value="owner">Owner</option>
                  <option value="admin">Admin</option>
                  <option value="operator">Operator</option>
                  <option value="client">Client</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-teal-600 text-white py-3 text-sm uppercase tracking-widest font-semibold hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating account...' : 'Create Account with Google'}
              </button>

              <button
                type="button"
                onClick={() => setUseGoogleSignUp(false)}
                className="w-full border border-[#E5E7EB] py-3 text-sm font-semibold text-[#111827] hover:bg-[#F9FAFB] transition-colors"
              >
                Back to Email Sign Up
              </button>
            </form>
          </>
        )}

        <p className="text-center text-sm text-[#6B7280] mt-8">
          Already have an account?{' '}
          <Link href="/login" className="text-teal-600 hover:text-teal-700 font-medium transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
