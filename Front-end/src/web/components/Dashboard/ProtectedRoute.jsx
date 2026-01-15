import { Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../../../supabase";
import { useSupabaseAuth } from "../Hooks/useSupabaseAuth";

const ProtectedRoute = ({ children }) => {
  // Use the enhanced auth hook for better state management
  const { user, session, loading: authLoading } = useSupabaseAuth();
  const location = useLocation();
  
  // Local state for additional validation
  const [localLoading, setLocalLoading] = useState(true);
  const [sessionExists, setSessionExists] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    let mounted = true;

    const validateSession = async () => {
      try {
        // If auth hook is still loading, wait
        if (authLoading) {
          return;
        }

        // Double-check session with direct Supabase call
        const { data, error } = await supabase.auth.getSession();
        
        if (mounted) {
          if (error) {
            console.error('Session validation error:', error);
            setSessionExists(false);
          } else {
            const session = data.session;
            if (session?.user && session?.access_token) {
              // Check if session is not expired
              const now = Date.now() / 1000;
              const isExpired = session.expires_at && session.expires_at <= now;
              
              // Session is valid if:
              // 1. Auth hook says user/session exist
              // 2. Direct check confirms session exists
              // 3. Session is not expired
              const isValid = !!(user && session && !isExpired);
              setSessionExists(isValid);
            } else {
              setSessionExists(false);
            }
          }
          setAuthChecked(true);
          setLocalLoading(false);
        }
      } catch (err) {
        console.error('Session validation failed:', err);
        if (mounted) {
          setSessionExists(false);
          setAuthChecked(true);
          setLocalLoading(false);
        }
      }
    };

    // Only run validation when auth hook loading is complete
    if (!authLoading) {
      validateSession();
    }

    return () => {
      mounted = false;
    };
  }, [authLoading, user, session]);

  // Listen for auth state changes for real-time updates
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('ProtectedRoute - Auth event:', event);
      
      if (event === 'SIGNED_OUT' || !session) {
        setSessionExists(false);
        setAuthChecked(true);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // Validate the new session
        const now = Date.now() / 1000;
        const isExpired = session.expires_at && session.expires_at <= now;
        const isValid = !!(session?.user && session?.access_token && !isExpired);
        setSessionExists(isValid);
        setAuthChecked(true);
      }
      setLocalLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Show nothing while checking authentication (no loading UI)
  if (authLoading || localLoading || !authChecked) {
    return null;
  }

  // User is not authenticated - redirect to login
  if (!user || !session || !sessionExists) {
    console.log('Redirecting to login - No valid authentication');
    return (
      <Navigate 
        to="/login" 
        state={{ from: location.pathname }} 
        replace 
      />
    );
  }

  // User is authenticated - render protected content
  return children;
};

export default ProtectedRoute;