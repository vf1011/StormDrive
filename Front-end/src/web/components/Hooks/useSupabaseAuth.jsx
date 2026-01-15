// hooks/useSupabaseAuth.js
import { useEffect, useState } from 'react';
import { supabase } from '../../../supabase';

export const useSupabaseAuth = () => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session error:', error);
          setSession(null);
          setUser(null);
        } else if (initialSession?.user) {
          // Validate session is still active
          const now = Date.now() / 1000;
          if (initialSession.expires_at && initialSession.expires_at > now) {
            setSession(initialSession);
            setUser(initialSession.user);
          } else {
            // Session expired
            console.log('Session expired');
            setSession(null);
            setUser(null);
          }
        } else {
          setSession(null);
          setUser(null);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        setSession(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth event:', event);
        
        if (event === 'SIGNED_OUT' || !session) {
          setSession(null);
          setUser(null);
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setSession(session);
          setUser(session?.user || null);
        }
        
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Standard logout function - no history manipulation
  const logout = async () => {
    try {
      await supabase.auth.signOut();
      // Auth state change will automatically update user/session to null
    } catch (error) {
      console.error('Logout error:', error);
      // Force state update even if signOut fails
      setSession(null);
      setUser(null);
    }
  };

  return { 
    user, 
    session, 
    loading, 
    logout,
    isAuthenticated: !!(user && session)
  };
};