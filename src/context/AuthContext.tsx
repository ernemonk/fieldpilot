'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getUser, createUser } from '@/lib/firestore';
import type { User, UserRole } from '@/lib/types';

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string, tenantId: string, role: UserRole) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signUpWithGoogle: (tenantId: string, role: UserRole) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        // Try to find user in any tenant - for now using a default tenant
        // In production, you'd store tenantId in custom claims or user metadata
        const tenantId = localStorage.getItem('fp_tenantId') || 'default';
        const appUser = await getUser(tenantId, fbUser.uid);
        setUser(appUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
    // Don't set user here - let onAuthStateChanged do it
  };

  const signUp = async (
    email: string,
    password: string,
    displayName: string,
    tenantId: string,
    role: UserRole
  ) => {
    // Save tenantId early so onAuthStateChanged can find the correct tenant
    try {
      localStorage.setItem('fp_tenantId', tenantId);
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const newUser: User = {
        uid: cred.user.uid,
        tenantId,
        role,
        displayName,
        email,
        status: 'active',
        createdAt: new Date(),
      };
      await createUser(tenantId, newUser);
      // Ensure local UI state reflects the newly created user immediately
      setUser(newUser);
    } catch (err) {
      console.error('Error creating user in signUp:', err);
      throw err;
    }
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      // Ensure we have a tenantId (use default if none)
      const tenantId = localStorage.getItem('fp_tenantId') || 'default';
      localStorage.setItem('fp_tenantId', tenantId);

      const result = await signInWithPopup(auth, provider);

      // If a Firestore user doesn't exist for this tenant, create one with a sensible default role
      const existingUser = await getUser(tenantId, result.user.uid);
      if (!existingUser) {
        const newUser: User = {
          uid: result.user.uid,
          tenantId,
          role: 'operator',
          displayName: result.user.displayName || 'User',
          email: result.user.email || '',
          status: 'active',
          createdAt: new Date(),
        };
        await createUser(tenantId, newUser);
        setUser(newUser);
      } else {
        setUser(existingUser);
      }
    } catch (err) {
      console.error('Error in signInWithGoogle:', err);
      throw err;
    }
  };

  const signUpWithGoogle = async (tenantId: string, role: UserRole) => {
    const provider = new GoogleAuthProvider();
    try {
      // set tenantId before sign-in so onAuthStateChanged can resolve the Firestore user
      localStorage.setItem('fp_tenantId', tenantId);
      const result = await signInWithPopup(auth, provider);

      // Check if user already exists
      const existingUser = await getUser(tenantId, result.user.uid);

      if (!existingUser) {
        // Create new user
        const newUser: User = {
          uid: result.user.uid,
          tenantId,
          role,
          displayName: result.user.displayName || 'User',
          email: result.user.email || '',
          status: 'active',
          createdAt: new Date(),
        };
        await createUser(tenantId, newUser);
        // set local UI state immediately
        setUser(newUser);
      }
    } catch (err) {
      console.error('Error in signUpWithGoogle:', err);
      throw err;
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
    localStorage.removeItem('fp_tenantId');
  };

  return (
    <AuthContext.Provider value={{ firebaseUser, user, loading, signIn, signUp, signInWithGoogle, signUpWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
