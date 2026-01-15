import { useState, useEffect } from "react";
import {
  Home,
  FileText,
  Share2,
  Upload,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import DashboardNav from "./DashboardNav";
import { supabase } from "../../../supabase";
import FileDisplay from "./FileDisplay";
import StorageUsage from "./Storage/StorageUsage";
import useIdleLogout from "../Hooks/useIdleLogout";
import "./Styles/DashboardLayout.css";
import QuoteBox from "./QuoteBox";



const Dashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  useIdleLogout();
  
  const params = new URLSearchParams(location.search);
  const initialTab = params.get('tab') || 'overview';
  const [activeCategory, setActiveCategory] = useState(initialTab);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);
  
  // Track if user has explicitly logged out
  const [hasLoggedOut, setHasLoggedOut] = useState(false);

  const navigationItems = [
    { id: "overview", icon: <Home size={20} />, label: "Overview" },
    { id: "myfiles", icon: <FileText size={20} />, label: "My Files" },
    { id: "shared", icon: <Share2 size={20} />, label: "Shared" },
    { id: "upload", icon: <Upload size={20} />, label: "Upload" },
    { id: "trash", icon: <Trash2 size={20} />, label: "Trash"},
  ];


  const handleCategoryChange = (category, e) => {
    e.preventDefault();
    setActiveCategory(category);
    const next = new URLSearchParams(location.search);
    next.set('tab', category);
    navigate({ search: next.toString() }, { replace: true });
  };


  // const confirmLeave = () => {
  //   setShowLeaveModal(false);
    
  //   if (pendingNavigation === 'browser_back') {
  //     // User confirmed browser back - logout normally
  //     handleLogout();
  //   } else if (pendingNavigation) {
  //     if (pendingNavigation.includes('/login') || pendingNavigation === '/') {
  //       // User going to login/root - logout
  //       handleLogout();
  //     } else {
  //       // External navigation - logout first then navigate
  //       handleLogout().then(() => {
  //         // After logout completes, navigate externally
  //         setTimeout(() => {
  //           window.location.href = pendingNavigation;
  //         }, 100);
  //       });
  //     }
  //   } else {
  //     handleLogout();
  //   }
    
  //   setPendingNavigation(null);
  // };



  // const cancelLeave = () => {
  //   setShowLeaveModal(false);
  //   setPendingNavigation(null);
    
  //   // Only restore history if user hasn't logged out
  //   if (!hasLoggedOut && pendingNavigation === 'browser_back') {
  //     window.history.pushState(null, '', location.pathname);
  //   }
  // };

  
const confirmLeave = async () => {
  setShowLeaveModal(false);
  setPendingNavigation(null);
  setHasLoggedOut(true); // prevent future intercepts in this session

  try {
    await supabase.auth.signOut();
  } catch (e) {
    console.error('Logout error:', e);
  }

  // Send a clear signal to /login that this was an intentional logout
  navigate('/login', {
    replace: true,
    state: {
      fromLogout: true,
      message: 'You have been logged out.',
      reason: 'user_leave',
    },
  });
};

  const cancelLeave = () => {
  setShowLeaveModal(false);
  setPendingNavigation(null);
  // No navigation; user remains on dashboard
};

useEffect(() => {
  if (hasLoggedOut) return;

  // A stable guard state to keep the user on this page when Back is pressed
  const guardState = { guard: 'dashboard' };

  // Ensure the current entry has guard, then add one more so a Back will pop but not leave
  const at = location.pathname + location.search;
  if (!window.history.state || window.history.state.guard !== 'dashboard') {
    window.history.replaceState(guardState, '', at);
    window.history.pushState(guardState, '', at);
  }

  const onPop = (e) => {
    if (hasLoggedOut) return;
    // Show leave modal instead of actually leaving
    setPendingNavigation('browser_back');
    setShowLeaveModal(true);

    // Re-push guard so we remain on dashboard
    window.history.pushState(guardState, '', at);
  };

  window.addEventListener('popstate', onPop);
  return () => window.removeEventListener('popstate', onPop);
}, [location.pathname, location.search, hasLoggedOut]);


  useEffect(() => {
  if (!showLeaveModal) return;
  const prev = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  return () => { document.body.style.overflow = prev; };
}, [showLeaveModal]);

  return (
    <div className="dashboard">
      <button
        className="mobile-menu-button"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <div className={`sidebar ${collapsed ? "collapsed" : ""}`}>
        <div className="sidebar-header">
          <button
            className="toggle-btn"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        <nav className="nav-menu">
          {navigationItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${activeCategory === item.id ? "active" : ""}`}
              onClick={(e) => handleCategoryChange(item.id, e)}
            >
              <div className="nav-item-icon">{item.icon}</div>
              {!collapsed && <span>{item.label}</span>}
            </button>
          ))}
        </nav>


        {!collapsed && (
          <div className="p-4 bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-md">
            <StorageUsage collapsed={true} />
          </div>
        )}
      </div>

      {mobileMenuOpen && (
        <div
          className="mobile-menu-overlay"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="mobile-menu-content"
            onClick={(e) => e.stopPropagation()}
          >
            <nav>
              {navigationItems.map((item) => (
                <button
                  key={item.id}
                  className="nav-item"
                  onClick={(e) => {
                    handleCategoryChange(item.id, e);
                    setMobileMenuOpen(false);
                  }}
                >
                  <div className="nav-item-icon">{item.icon}</div>
                  <span>{item.label}</span>
                </button>
              ))}
              

            </nav>
          </div>
        </div>
      )}

      {/* Leave Modal - only show if not logged out */}
     {showLeaveModal && !hasLoggedOut && (
        <div className="leave-modal-backdrop" onClick={cancelLeave} aria-hidden="true">
          <div
            className="leave-modal-content"
            role="dialog"
            aria-modal="true"
            aria-labelledby="leave-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="leave-modal-header">
              <h3 id="leave-modal-title" className="leave-modal-title">⚠️ Leave Dashboard?</h3>
            </div>
            
            <div className="leave-modal-body">
              <p className="leave-modal-text">
                Are you sure you want to leave the dashboard?
              </p>
            </div>
            
            <div className="leave-modal-buttons">
              <button 
                className="leave-btn cancel" 
                onClick={cancelLeave}
                autoFocus
              >
                Stay in Dashboard
              </button>
              <button 
                className="leave-btn confirm" 
                onClick={confirmLeave}
              >
                Leave & Logout
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="dashboard-main">
        <DashboardNav />
       {activeCategory === 'overview' && <QuoteBox />}

     <FileDisplay category={activeCategory} refreshTrigger={refreshTrigger} />

      {/* {activeCategory === 'trash' && (
        <TrashPage onFileRestored={triggerDashboardRefresh} />
      )} */}

      </div>
    </div>
  );
};

export default Dashboard;