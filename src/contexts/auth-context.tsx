
'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User, signOut as firebaseSignOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { UserProfile } from '@/types/firestore';
import { useAppContext } from './app-context';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { setAnalysisCompleted, setRelatives, setAncestry, setInsights } = useAppContext();


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      if (user) {
        setUser(user);
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const profile = userDoc.data() as UserProfile;
          setUserProfile(profile);
          if (profile.analysis) {
            setAnalysisCompleted(true);
            setRelatives(profile.analysis.relatives);
            setAncestry(profile.analysis.ancestry);
            setInsights(profile.analysis.insights);
          } else {
             setAnalysisCompleted(false);
          }
        } else {
            setUserProfile(null);
            setAnalysisCompleted(false);
        }
      } else {
        setUser(null);
        setUserProfile(null);
        setAnalysisCompleted(false);
        setRelatives(null);
        setAncestry(null);
        setInsights(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [setAnalysisCompleted, setRelatives, setAncestry, setInsights]);

  const signOut = async () => {
    await firebaseSignOut(auth);
    // State will be cleared by the onAuthStateChanged listener
  };

  const value = { user, userProfile, loading, signOut };

  return (
    <AuthContext.Provider value={value}>
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
