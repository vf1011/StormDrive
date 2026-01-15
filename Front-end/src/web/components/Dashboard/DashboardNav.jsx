import { useState, useEffect } from "react";
import { useSupabaseAuth } from "../Hooks/useSupabaseAuth";
import { supabase } from "../../../supabase";
import { useNavigate, Link } from "react-router-dom";
import { useFileContext } from "../Hooks/FileContext";
import { Search, Settings } from "lucide-react";
import ThemeToggle from "../Styles/ThemeToggle";
import PageTransition from "../Transitions/PageTransition";
import "./Styles/DashboardNav.css";
import Logo from "../Logo";
import { API_BASE_URL } from "../../../core/api/config";

const MAX_QUERY_LEN = 128;

const api = API_BASE_URL;

const DashboardNav = () => {
  const navigate = useNavigate();
  const { user } = useSupabaseAuth();
  const isLoggedIn = !!user;

  const [showTransition, setShowTransition] = useState(false);
  const [transitionDirection, setTransitionDirection] = useState("right");
  const [isAnimating, setIsAnimating] = useState(false);
  const [notification, setNotification] = useState(0);
  const [avatarVersion, setAvatarVersion] = useState(Date.now());
  const [imgError, setImgError] = useState(false);

  const { setSearchResults, setIsSearching, searching, setSearching } = useFileContext();

  // Derive a safe initial for fallback avatar
  const userInitial =
    user?.user_metadata?.full_name?.trim()?.charAt(0)?.toUpperCase() ||
    user?.email?.split("@")[0]?.charAt(0)?.toUpperCase() ||
    "";

  // Keep avatar fresh if profile updates or token refresh happens
  useEffect(() => {
    const { data: { subscription } = { subscription: null } } =
      supabase.auth.onAuthStateChange((event) => {
        if (event === "USER_UPDATED" || event === "TOKEN_REFRESHED") {
          setAvatarVersion(Date.now());
          setImgError(false); // retry loading avatar
        }
      });
    return () => {
      subscription?.unsubscribe?.();
    };
  }, []);

  // Notification count (standardize on axios `api`)
  useEffect(() => {
    if (!isLoggedIn) return;

    let mounted = true;
    (async () => {
      try {
        // Token should be attached by axios interceptor; no per-call token fetch
        const res = await api.get("/notifications/count");
        if (mounted) setNotification(res?.data?.count ?? 0);
      } catch (e) {
        console.error("Failed to fetch notifications:", e);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [isLoggedIn]);

  // Controlled search input: trim + clamp only (no DOMPurify needed)
  const handleSearchChange = (e) => {
    const raw = e.target.value ?? "";
    const clamped = raw.slice(0, MAX_QUERY_LEN); // allow trailing typing
    setSearching(clamped);
  };

  // Debounced, cancelable search
  useEffect(() => {
    const q = (searching ?? "").trim();
    if (!q) {
      setSearchResults({ result: [], folders: [] });
      setIsSearching(false);
      return;
    }

    const ctrl = new AbortController();
    const id = setTimeout(async () => {
      try {
        const res = await api.get("/files/fts", {
          params: { query: q },
          signal: ctrl.signal,
        });
        setSearchResults({
          result: res?.data?.result || [],
          folders: res?.data?.folders || [],
        });
        setIsSearching(true);
      } catch (err) {
        if (err?.code === "ERR_CANCELED" || err?.name === "AbortError") return;
        console.error("Search error:", err);
        // Don’t clear results on error; keep previous ones
      }
    }, 300);

    return () => {
      clearTimeout(id);
      ctrl.abort();
    };
  }, [searching, setSearchResults, setIsSearching]);

  // Logo -> go home without hard reload
  // const handleLogoClick = (e) => {
  //   e.preventDefault();
  //   setSearching(""); // clear search box when returning home
  //   setSearchResults({ result: [], folders: [] });
  //   setIsSearching(false);
  //   navigate("/dashboard");
  // };

  // Transition + auth flows
  const [pendingSignOut, setPendingSignOut] = useState(false);
  const handleSignOut = async () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setPendingSignOut(true);
    setTransitionDirection("right");
    setShowTransition(true);
  };

  const handleSignIn = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setTransitionDirection("left");
    setShowTransition(true);
  };

  const handleToggleClick = () => {
    if (isLoggedIn) handleSignOut();
    else handleSignIn();
  };

  const handleTransitionEnd = async (e) => {
    const name = e?.animationName;
    if (name !== "blurAndSlideRight" && name !== "blurAndSlideLeft") return;

    try {
      if (pendingSignOut) {
        // Backend logout (cookie/session) + Supabase logout
        try {
          await api.post("/auth/logout");
        } catch (e) {
          // Non-fatal: continue signing out from Supabase
          console.warn("Backend logout failed, proceeding with Supabase sign-out", e);
        }
        await supabase.auth.signOut();
        localStorage.removeItem("userToken");
        navigate("/login");
      } else {
        // Go to login on sign-in flow
        navigate("/login");
      }
    } catch (error) {
      console.error("Sign-out flow error:", error);
    } finally {
      setPendingSignOut(false);
      setIsAnimating(false);
    }
  };

  return (
    <>
      <PageTransition
        show={showTransition}
        onAnimationEnd={handleTransitionEnd}
        direction={transitionDirection}
      />

      <div className="dashboard-nav">
        <div className="nav-left">
          <div className="nav-logo">
            <img
              src="/images/SD_LOGO.png"
              alt="StormDrive"
              className="logo-image"
              draggable={false}
            />
            <Link
              to="/dashboard"
              className="logo-link"
              onClick={() => {
                setSearching("");
                setSearchResults({ result: [], folders: [] });
                setIsSearching(false);
              }}
            >
              <Logo />
            </Link>
          </div>

          <div className="search-container">
            <Search className="search-icon" size={20} aria-hidden="true" />
            <input
              type="text"
              placeholder="Search files and folders..."
              value={searching ?? ""}
              onChange={handleSearchChange}
              aria-label="Search files and folders"
              autoComplete="off"
              inputMode="search"
            />
          </div>
        </div>

        <div className="nav-actions">
          <ThemeToggle />

          {/* You can add a bell with {notification} badge here if/when ready */}

          <Link to="/settings" className="icon-button" aria-label="Open settings">
              <Settings size={20} />
          </Link>

          <button
            className={`auth-toggle ${!isLoggedIn ? "signed-out" : ""} ${isAnimating ? "animating" : ""}`}
            onClick={handleToggleClick}
            disabled={isAnimating}
            aria-label={isLoggedIn ? "Sign out" : "Sign in"}
          >
            {isLoggedIn && user?.user_metadata?.avatar_url && !imgError ? (
              <img
                className="nav-avatar h-9 w-9 rounded-full object-cover shadow"
                src={`${user.user_metadata.avatar_url}?v=${avatarVersion}`}
                alt="Avatar"
                onError={() => setImgError(true)}
                draggable={false}
              />
            ) : (
              <span className="toggle-button" aria-hidden="true">
                {userInitial || "↪"}
              </span>
            )}
            <span className="toggle-text">
              {isLoggedIn ? "Click to sign out" : "Click to sign in"}
            </span>
          </button>
        </div>
      </div>
    </>
  );
};

export default DashboardNav;
