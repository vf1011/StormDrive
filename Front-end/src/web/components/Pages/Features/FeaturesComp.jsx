import React from 'react';
import './FeaturesComp.css';

const FeaturesComp = () => {
  const integrations = [
    {
      image:'https://images.unsplash.com/photo-1669060475985-e72f27a63241?q=80&w=3132&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      title: 'Smart Delta Upload',
      description: 'When you upload a file you’ve already saved before, StormDrive will only upload the parts you changed, not the whole file. This makes your uploads much faster and saves your internet data.'
    },
    {
      image:'https://plus.unsplash.com/premium_photo-1661878265739-da90bc1af051?q=80&w=1986&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      title: 'Temporary Vaults with Alternate Login',
      description: 'You can store sensitive files in a hidden vault that can only be unlocked with a separate passcode, even if someone logs into your main account.',
    },
    {
      image:'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      title: 'Smart Storage Pricing ',
      description: 'Unlike other platforms that force you to buy fixed plans, StormDrive lets you pay only for the storage you actually use — no waste, no extra charges.'
    },
    {
      image:'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2944&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      title: 'Special Secured Sign-In ',
      description: 'We offer a unique 16-bit secure login option that adds another layer of protection, making it almost impossible for someone else to access your account.'
    },
    {
      image:'https://images.unsplash.com/photo-1614064548237-096f735f344f?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      title: 'Smart Delta Download',
      description: 'StormDrive only uploads the parts of your files that have changed, saving you time and internet data with every update.'
    },
    {
      image:'https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?q=80&w=2940&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      title: 'Only You Hold the Key',
      description: 'StormDrive never stores your password or encryption keys. This means even StormDrive cannot unlock your files — only you can.'
    },
  ];

   const floatingIcons = ['🔐', '💾 ', '⚡ ', '🕒 ', '🔑', '📋'];


  return (
    <div className="storm-app">
      

      {/* Features Section */}
      <section className="storm-integrations" id="features">
        <div className="storm-integrations-wrap">
          <div className="storm-main-layout">
            <div className="storm-title-section">
              <h2 className="storm-main-title">What StormDrive Offers</h2>
            </div>
            
            <div className="storm-cards-wrapper">
              {integrations.map((integration, index) => (
                <div key={index} className="storm-integration-card">

                <img src={integration.image} className="storm-feature-image" />
                    <div className="feature-overlay"></div>
                     <div className="storm-feature-static-content">
                        <h3 className="storm-feature-title">{integration.title}</h3>
                    </div>
                     <div className="storm-feature-description-section">
                        <p>{integration.description}</p>
                    </div>
                   
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {/* <section className="storm-cta">
        <div className="storm-cta-wrap">
          <h2 className="storm-cta-title">Get started now</h2>
          <p className="storm-cta-desc">
            StormDrive starts at our budget-friendly plan and scales with your needs. 
            Start optimizing your workflow effortlessly with our free trial and discover 
            advanced capabilities built for your success.
          </p>
          <div className="storm-cta-buttons">
            <a href="#" className="storm-btn-primary">Start for Free</a>
            <a href="#" className="storm-btn-secondary">Schedule Demo</a>
          </div>
        </div>
      </section> */}

      {/* Footer */}
      <footer className="feature-footer">
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
  );
};

export default FeaturesComp;