import React, { useState } from 'react';
import { Link } from "react-router-dom";
import { useLoading } from './Hooks/LoadingContext';
import { motion, useScroll, useSpring } from "framer-motion";
import PricingPlan from './Pages/Pricing/Pricing';
import './HomePage.css';

const HomePage = () => {
    const{loading, setLoading} = useLoading();
    const { scrollYProgress } = useScroll();
  
    async function loadData() {
      setLoading(true);
      try {
        // simulate async
        await new Promise((r) => setTimeout(r, 1000));
      } finally {
        setLoading(false);
      }
    }
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  const [isYearly, setIsYearly] = useState(false);

  return (
    <>
      <motion.div 
        className="progress-bar"
        style={{ 
          scaleX,
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '5px',
          background: '#4299e1',
          transformOrigin: '0%',
          zIndex: 1000
        }} 
      />
      <div className="home-page">
        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-content">
            <h1>From Cloud to Storm,<br />We've Got You Covered.</h1>
            <p>Ride Out the Storm with Secure Storage.<br />Your Data's Safety is Our Priority.</p>
            <div className="hero-buttons">
            <Link to="/register" className="register-button" onClick={loadData}>Sign Up Now</Link>
            <Link to="/login" className='register-button' onClick={loadData}>Login</Link>
            </div>
          </div>
          <div >
            <img className="hero-image"src="/images/tornadov1.png" alt="Storm illustration" />
          </div>
        </section>

        {/* About Section */}
        <section className="about-section">
          <h2>About<br />STORMDRIVE</h2>
          <p>
          StormDrive is a secure, user-centric cloud storage solution offering end-to-end encryption, seamless multi-device syncing, and integrated real-time editing tools. Designed with privacy at its core, StormDrive ensures your data remains protected, organized, and accessible across all platforms. Features like smart versioning, customizable sharing permissions, and built-in ransomware protection make it ideal for individuals and teams alike. With zero-knowledge architecture and no data mining, StormDrive empowers users to store, share, and collaborate with confidence — where privacy meets productivity.
          </p>
        </section>

        {/* Features Section */}
        <section className="features-section">
          <h2>FEATURES</h2>
          <div className="features-container">
            <div className="feature-pill">
              <div className="feature-icon">
                <img src="/images/secure-links.jpeg" alt="Secure Shared Links" />
              </div>
              <h3>Secure<br />Shared Links</h3>
              <p>Enhanced security for shared links by limiting the number of clicks</p>
            </div>

            <div className="feature-pill">
              <div className="feature-icon">
                <img src="/images/temp-folder.jpeg" alt="Temporary Folder" />
              </div>
              <h3>Temporary<br />Folder</h3>
              <p>Store files temporarily so that the user can directly access them without signing-in into the main account.</p>
            </div>

            <div className="feature-pill">
              <div className="feature-icon">
                <img src="/images/data-org.jpeg" alt="Data Organization" />
              </div>
              <h3>Data<br />Organization</h3>
              <p>Advance data-usage visualization and segregation</p>
            </div>

            <div className="feature-pill">
              <div className="feature-icon">
                <img src="/images/quick-search.jpeg" alt="Quick Search" />
              </div>
              <h3>QuickSearch</h3>
              <p>Powerful and more efficient search bar with excellent indexing.</p>
            </div>
          </div>
          <div className="explore-container">
            <span>Explore</span>
            <span className="arrow">→</span>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="pricing-section">
          <h2>PRICING PLANS</h2>
          <div className="billing-toggle">
            <span className={!isYearly ? 'active' : ''}>Bill Monthly</span>
            <label className="switch">
              <input 
                type="checkbox" 
                checked={isYearly}
                onChange={() => setIsYearly(!isYearly)}
              />
              <span className="slider"></span>
            </label>
            <span className={isYearly ? 'active' : ''}>Bill Yearly</span>
          </div>
          <div className="pricing-grid">
            <div className="pricing-card">
              <h3>Basic</h3>
              <p className="price">
                <span className="currency">$</span>
                <span className="amount">{isYearly ? '70' : '80'}</span>
                <span className="period">Per Month</span>
              </p>
              <ul className="features-list">
                <li className="included">
                  <span className="icon">✓</span>
                  
                </li>
                <li className="included">
                  <span className="icon">✓</span>
                  
                </li>
                <li className="included">
                  <span className="icon">✓</span>
                 
                </li>
                <li className="excluded">
                  <span className="icon">×</span>
             
                </li>
                <li className="excluded">
                  <span className="icon">×</span>
                 
                </li>
              </ul>
              <button className="purchase-btn">Purchase Plan</button>
            </div>

            <div className="pricing-card pro">
              <h3>Pro</h3>
              <p className="price">
                <span className="currency">$</span>
                <span className="amount">{isYearly ? '140' : '150'}</span>
                <span className="period">Per Month</span>
              </p>
              <ul className="features-list">
                <li className="included">
                  <span className="icon">✓</span>
                
                </li>
                <li className="included">
                  <span className="icon">✓</span>
                  
                </li>
                <li className="included">
                  <span className="icon">✓</span>
                 
                </li>
                <li className="included">
                  <span className="icon">✓</span>
              
                </li>
                <li className="included">
                  <span className="icon">✓</span>
                 
                </li>
              </ul>
              <button className="purchase-btn">Purchase Plan</button>
            </div>

            <div className="pricing-card">
              <h3>Advanced</h3>
              <p className="price">
                <span className="currency">$</span>
                <span className="amount">{isYearly ? '170' : '180'}</span>
                <span className="period">Per Month</span>
              </p>
              <ul className="features-list">
                <li className="included">
                  <span className="icon">✓</span>
                </li>
                <li className="included">
                  <span className="icon">✓</span>
                 
                </li>
                <li className="included">
                  <span className="icon">✓</span>
                
                </li>
                <li className="included">
                  <span className="icon">✓</span>
                
                </li>
                <li className="included">
                  <span className="icon">✓</span>
                 
                </li>
              </ul>
              <button className="purchase-btn">Purchase Plan</button>
            </div>
          </div>
          <div className="explore-container">
          <Link to="/pricing" className="explore-link">Explore</Link>
            <span className="arrow">→</span>
          </div>
        </section>

        {/* Footer */}
        <footer className="footer">
          <div className="footer-content">
            <div className="footer-column">
              <h4>Product & Features</h4>
              <ul>
                <li><a href="#">Secure Cloud Storage</a></li>
                <li><a href="#">Version Tracking</a></li>
                <li><a href="#">Temporary Access</a></li>
                <li><a href="#">Flexible Pricing</a></li>
                <li><a href="#">Encrypted Sharing</a></li>
              </ul>
            </div>
            
            <div className="footer-column">
              <h4>Company</h4>
              <ul>
                <li><a href="#">About Us</a></li>
                <li><a href="#">Careers</a></li>
                <li><a href="#">Blog</a></li>
                <li><a href="#">Press & Media</a></li>
              </ul>
            </div>
            
            <div className="footer-column">
              <h4>Support</h4>
              <ul>
                <li><a href="#">Help Center</a></li>
                <li><a href="#">FAQs</a></li>
                <li><a href="#">Contact Us</a></li>
                <li><a href="#">Security & Compliance</a></li>
              </ul>
            </div>
            
            <div className="footer-column">
              <h4>Legal & Privacy</h4>
              <ul>
                <li><a href="#">Terms of Service</a></li>
                <li><a href="#">Privacy Policy</a></li>
                <li><a href="#">Data Protection Policy</a></li>
                <li><a href="#">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2025 Storm. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </>
  );
};

export default HomePage;
