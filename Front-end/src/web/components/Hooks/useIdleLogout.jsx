import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../../supabase';
import { useNavigate, useLocation } from 'react-router-dom';

const useIdleLogout = (timeout = 15 * 60 * 1000) => { // 15 minutes default
  const navigate = useNavigate();
  const location = useLocation();
  const idleTimerRef = useRef(null);
  const [isIdle, setIsIdle] = useState(false);
  
  // Warning before logout (2 minutes before timeout)
  const warningTime = timeout - (2 * 60 * 1000);
  const warningTimerRef = useRef(null);
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    // Only run idle logout on dashboard pages
    if (!location.pathname.includes('/dashboard')) {
      return;
    }

    const logout = async () => {
      try {
        setIsIdle(true);
        
        const { error } = await supabase.auth.signOut();
        if (!error) {
          // Use custom notification instead of alert
          console.log("User signed out due to inactivity");
          
          // Navigate to login with idle logout flag
          navigate("/login", { 
            replace: true, 
            state: { 
              fromLogout: true, 
              reason: 'idle_timeout',
              message: 'You were signed out due to inactivity.'
            }
          });
        } else {
          console.error("Idle logout error:", error.message);
        }
      } catch (err) {
        console.error("Idle logout failed:", err);
        // Force navigation even if logout fails
        navigate("/login", { 
          replace: true, 
          state: { 
            fromLogout: true, 
            reason: 'idle_timeout_error',
            message: 'Session expired due to inactivity.'
          }
        });
      }
    };

    const showIdleWarning = () => {
      setShowWarning(true);
      console.log("Idle warning: You will be logged out in 2 minutes due to inactivity");
      
      // You can dispatch a custom event here for a warning modal
      window.dispatchEvent(new CustomEvent('idleWarning', {
        detail: { timeRemaining: 2 * 60 * 1000 } // 2 minutes
      }));
    };

    const resetTimers = () => {
      // Clear existing timers
      clearTimeout(idleTimerRef.current);
      clearTimeout(warningTimerRef.current);
      
      // Hide warning if showing
      if (showWarning) {
        setShowWarning(false);
        window.dispatchEvent(new CustomEvent('idleWarningDismissed'));
      }
      
      // Set new timers
      warningTimerRef.current = setTimeout(showIdleWarning, warningTime);
      idleTimerRef.current = setTimeout(logout, timeout);
    };

    // Events that indicate user activity
    const events = [
      'mousemove', 
      'keydown', 
      'scroll', 
      'click', 
      'touchstart',
      'touchmove',
      'focus',
      'blur'
    ];

    // Add event listeners
    events.forEach(event => {
      window.addEventListener(event, resetTimers, { passive: true });
    });

    // Start the timers
    resetTimers();

    // Cleanup function
    return () => {
      clearTimeout(idleTimerRef.current);
      clearTimeout(warningTimerRef.current);
      events.forEach(event => {
        window.removeEventListener(event, resetTimers);
      });
    };
  }, [timeout, navigate, location.pathname, warningTime, showWarning]);

  // Return idle state and warning state for components to use
  return {
    isIdle,
    showWarning,
    resetIdleTimer: () => {
      clearTimeout(idleTimerRef.current);
      clearTimeout(warningTimerRef.current);
      setShowWarning(false);
      setIsIdle(false);
    }
  };
};

export default useIdleLogout;