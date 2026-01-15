import React, { createContext, useState, useEffect } from 'react';
import { Route, Routes, useLocation } from "react-router-dom";
import Navbar from './web/components/Layout/Navbar';
import LoginPage from './web/components/Auth/LoginPage';  
import Register from './web/components/Auth/Register';
import HomePage from './web/components/HomePage';
import Forgot_Password from './web/components/Auth/Forget_Password';
import Reset_password from './web/components/Auth/Reset_Password';
import Dashboard from './web/components/Dashboard/DashboardLayout';
import ProtectedRoute from './web/components/Dashboard/ProtectedRoute';
import FilePreviewPage from './web/components/Dashboard/FilePreviewPage';
import Settings from './web/components/Settings/SettingLayout';
import PricingPlans from './web/components/Pages/Pricing/Pricing';
import ContactUs from './web/components/Pages/Contact_US/Contact';
import AboutUs from './web/components/Pages/About_US/About';
import FileDisplay from './web/components/Dashboard/FileDisplay';
import Features from './web/components/Pages/Features/Feature';
// import QuantumShieldCursor from './components/Styles/QuantumCursor';
import './App.css';

// Create theme context
export const ThemeContext = createContext();

function App() {
  const [theme, setTheme] = useState('light');
  const location = useLocation();
  const [quantumCursorEnabled, setQuantumCursorEnabled] = useState(true); // Add this state
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  // Toggle theme function


  useEffect(() => {
  const updateMousePosition = (e) => {
    setMousePosition({ x: e.clientX, y: e.clientY });
  };

  window.addEventListener("mousemove", updateMousePosition);
  return () => {
    window.removeEventListener("mousemove", updateMousePosition);
  };
}, []);
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  // Toggle quantum cursor function
  const toggleQuantumCursor = () => {
    const newState = !quantumCursorEnabled;
    setQuantumCursorEnabled(newState);
    localStorage.setItem('quantumCursor', newState.toString());
  };

  // Initialize theme and cursor settings from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setTheme(savedTheme);
    }

    const savedCursor = localStorage.getItem('quantumCursor');
    if (savedCursor !== null) {
      setQuantumCursorEnabled(savedCursor === 'true');
    }
  }, []);

  // Update data-theme attribute when theme changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Apply quantum cursor class to body
  useEffect(() => {
    if (quantumCursorEnabled) {
      document.body.classList.add('quantum-shield-active');
    } else {
      document.body.classList.remove('quantum-shield-active');
    }

    return () => {
      document.body.classList.remove('quantum-shield-active');
    };
  }, [quantumCursorEnabled]);

  // Determine if we should show quantum cursor based on current route

 return (
    <ThemeContext.Provider value={{ 
      theme, 
      toggleTheme, 
      quantumCursorEnabled, 
      toggleQuantumCursor 
    }}>
      <div className="App">

        {/* Quantum Shield Cursor on all pages */}
        {/* {quantumCursorEnabled && <QuantumShieldCursor mousePosition={mousePosition} />} */}

        {/* Navbar visible only outside dashboard/settings */}
        {!location.pathname.startsWith('/dashboard') && 
         !location.pathname.startsWith('/settings') &&
         <Navbar currentPath={location.pathname} />
        }

        <main className="main-content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path='/forget-password' element={<Forgot_Password />} />
            <Route path='/reset-password' element={<Reset_password />} />
            
            <Route path="/dashboard/*" element= {<ProtectedRoute><Dashboard /></ProtectedRoute>}>
              <Route index element={<FileDisplay category="overview" />} />
              <Route path="myfiles" element={<FileDisplay category="myfiles" />} />
              <Route path="shared" element={<FileDisplay category="shared" />} />
              <Route path="upload" element={<FileDisplay category="upload" />} />
              <Route path="trash" element={<FileDisplay category="trash" />} />
            </Route>

            <Route path='/file-preview' element={<FilePreviewPage />} />
            <Route path='/settings' element={<Settings />} />
            <Route path='/pricing' element={<PricingPlans />} />
            <Route path='/contact' element={<ContactUs />} />
            <Route path='/about' element={<AboutUs />} />
            <Route path='/features' element={<Features />} />
          </Routes>
        </main>
      </div>
    </ThemeContext.Provider>
  );
}

export default App;