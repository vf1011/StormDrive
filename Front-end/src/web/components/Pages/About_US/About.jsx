// import React from 'react';
// import './About.css';

// const AboutUs = () => {
//   return (
//     <div className="aboutus-page">
//       {/* Main Content */}
//       <main className="aboutus-main-content">
//         <div className="aboutus-container">
//           <div className="aboutus-content-layout">
//             {/* Left Side - Title and Navigation */}
//             <div className="aboutus-left-section">
//               <h1 className="aboutus-page-title">ABOUT US.</h1>
              
//               <nav className="aboutus-side-nav">
//                 <a href="#about" className="aboutus-nav-link active">About us.</a>
//                 <a href="#team" className="aboutus-nav-link">Our team.</a>
//               </nav>
//             </div>
            
//             {/* Right Side - Content and Image */}
//             <div className="aboutus-right-section">
//               <div className="aboutus-content-area">
//                 <div className="aboutus-text-content">
//                   <p className="aboutus-description">
//                     StormDrive is a privacy-first cloud storage platform built to empower individuals,
//                      teams, and enterprises with secure, flexible, and intelligent file management solutions.
//                     Founded in 2024, StormDrive was created by a passionate group of innovators who believe 
//                     that cloud storage should be both powerful and simple — without compromising privacy.
//                   </p>
                  
//                   <p className="aboutus-description">
//                    After years of navigating existing solutions that lacked transparency or adaptability,
//                     the team built StormDrive from scratch — focusing on encryption, smart file synchronization,
//                      and real-time collaboration.From startups to global organizations, StormDrive helps users store,
//                       share, and manage their files with confidence.
//                   </p>

//                    <p className="aboutus-description">
//                   StormDrive continues to grow thanks to the trust of our amazing community and the collaborative
//                    spirit of our developers, designers, and security experts who are constantly pushing the platform forward.
//                   </p>
//                 </div>
                
//               </div>
//             </div>
//           </div>
//            <div className="aboutus-image-content">
//             <img src="https://i.pinimg.com/736x/23/4a/0b/234a0b9c8bbb50893c0562d8cf89194d.jpg" alt="Team working in modern office" />
//          </div>
//         </div>
//       </main>

//       {/* Quote Section */}
//       <section className="aboutus-quote-section">
//         <div className="aboutus-container">
//           <div className="aboutus-quote-layout">
//             <div className="aboutus-quote-content">
//               <blockquote className="aboutus-quote">
//                 "At StormDrive, we believe technology should protect, not exploit.
//                 Your data belongs to you."
//               </blockquote>
//               <cite className="aboutus-quote-author">-Aaditya Jobanputra, Director</cite>
//             </div>
            
//             <div className="aboutus-quote-image">
//               <img src="/api/placeholder/400/300" alt="Person working with documents on wall" />
//             </div>
//           </div>
//         </div>
//       </section>

//       {/* Team Section */}
//       <section className="aboutus-team-section" id='team'>
//         <div className="aboutus-container">
//           <h2 className="aboutus-section-title">THE TEAM.</h2>
          
//           <div className="aboutus-team-layout">
//             <div className="aboutus-team-photos">
//               <div className="aboutus-main-photo">
//                 <img src="/images/Sir_photo.jpeg" alt="Team member" />
//               </div>
              
//               <div className="aboutus-secondary-photos">
//                 <div className="aboutus-photo">
//                   <img src="/images/Aadi.jpeg" alt="Team member" />
//                 </div>
//                 <div className="aboutus-photo">
//                   <img style={{ objectPosition:'bottom'}} src="/images/Heeru.jpeg" alt="Team member" />
//                 </div>
//               </div>
//             </div>
            
//             <div className="aboutus-team-description">
//               <p>
//                 StormDrive is powered by a small, focused team of engineers, designers, 
//                 and privacy advocates who believe that simple tools can solve complex problems.
//                 Our team isn't about buzzwords — we are about building things that matter.
//               </p>
              
//               <p>
//               We design, code, test, and improve StormDrive with a hands-on approach, balancing security,
//              design, and real-world usability. We’re proud to help you take back control of your data in 
//              a digital world that often asks you to trade convenience for privacy.
//               </p>

//               <p>
//                 We know your time is valuable — that’s why we’ve built StormDrive to work quickly, sync intelligently, and store securely.
//               </p>
//             </div>
//           </div>
          
//           {/* Stats */}
//           <div className="aboutus-stats">
//             <div className="aboutus-stat">
//               <div className="aboutus-stat-number">10,000</div>
//               <div className="aboutus-stat-label">Active users worldwide</div>
//             </div>
            
//             <div className="aboutus-stat">
//               <div className="aboutus-stat-number">50 TB</div>
//               <div className="aboutus-stat-label">Cloud storage managed</div>
//             </div>
            
//             <div className="aboutus-stat">
//               <div className="aboutus-stat-number">150,000</div>
//               <div className="aboutus-stat-label">File uploads monthly</div>
//             </div>
            
//             <div className="aboutus-stat">
//               <div className="aboutus-stat-number">25</div>
//               <div className="aboutus-stat-label">Enterprises using StormDrive</div>
//             </div>
//           </div>
//         </div>
//       </section>
//     </div>

//   );
// };

// export default AboutUs;

import React ,{ useState , useEffect} from 'react';
import './About.css'; // You can rename it as needed

const AboutUs = () => {
  const [currentSection, setCurrentSection] = useState(0);

    const teamMembers = [
    {
      name: "AADITYA JOBANPUTRA",
      role: "Director",
      image: "/images/Aadi.jpeg"
    },
    {
      name: "DISHANT PANDYA", 
      role: "Executive Director",
      image: "/images/Sir_photo.jpeg"
    },
    {
      name: "HIR RUPARELIYA",
      role: "Team Member", 
      image: "/images/Heeru.jpeg"
    },
    {
      name: "VENISHA FALDU",
      role: "Team Member", 
      image: "/images/Venisha.jpeg"
    }

  ];

  const features = [
    {
      title: " ZERO-KNOWLEDGE ENCRYPTION",
      description: "Only you can decrypt your files — absolute privacy."
    },
    {
      title: "PAY-AS-YOU-GO PRICING", 
      description: "Flexible, no-waste storage billing based on what you actually use."
    },
    {
      title: "SMART DELTA SYNC",
      description: "Faster uploads by syncing only changed file parts."
    },
    {
      title: "TEMPORARY VAULTS",
      description: "Time-limited, highly secure storage with alternate sign-ins."
    },
    {
      title: "RESUMABLE ENCRYPTED DOWNLOADS",
      description: "Securely resume interrupted downloads anytime."
    },
    {
      title: "SECURE SHARE LINKS",
      description: "Password-protected, time-bound, and limited-access file sharing."
    }
  ];

  const sections = [
    {
      id:'hero',
      color: '#667eea',
      content: (
        <div>
        <div className="about-hero-background">
          <img 
            src="https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
            alt="Professional team meeting"
            className="about-hero-image"
            style={{objectPosition: 'center top'}}
          />
          <div className="about-hero-overlay"></div>
        </div>
         <div className="about-hero-content">
          <h1 className="about-hero-title">ABOUT US</h1>
          <p className="about-hero-subtitle">Less clutter. More control. Your cloud, your way.</p> 
        </div>
        </div>
      )
    },
    {
      id:'about_us',
      color: '#6366f1',
      content: (
        <div className="aboutus-container">
          <div className="aboutus-grid">
            <div className="aboutus-content">
              <h2 className="aboutus-section-title">WHO WE ARE</h2>
              
              <div className="aboutus-text">
                <p className="aboutus-quote">
                  "Empowering users with privacy, control, and seamless digital storage experiences."
                </p>
                
                <p>
                 StormDrive is a privacy-focused cloud platform designed to give users complete control 
                 over their digital assets. Our mission is to simplify secure storage while delivering a 
                 scalable and intuitive user experience.
                </p>
                
                <div className="aboutus-quote-section">
                 
                  <p>
                    Since our inception, we've worked with industry-leading security experts to build a platform that protects your data without compromising speed or accessibility. We are proud to partner with trusted cloud providers who share our vision of privacy and security.
                  </p>
                </div>
              </div>
              
    
            </div>
            
            <div className="aboutus-image">
              <div className="image-card">
                <img 
                  src="https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mjd8fHRlY2hub2xvZ3l8ZW58MHx8MHx8fDA%3D"
                  alt="Professional portrait"
                  className="portrait-image"
                />
              </div>
            </div>
          </div>
        </div>

      )

    },
    {
      id: 'why_choose_us',
      color: '#10b981',
      content: (
        <div className="aboutus-container">
          <div className="why-choose-grid">
            <div className="why-choose-image">
              <img 
                src="https://plus.unsplash.com/premium_photo-1683120968693-9af51578770e?q=80&w=963&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
                alt="Team collaboration"
                className="collaboration-image"
              />
            </div>
            
            <div className="why-choose-content">
              <h2 className="aboutus-section-title">WHY CHOOSE STORMDRIVE?</h2>
              
              <p className="aboutus-section-description">
               StormDrive isn't just another cloud storage solution. 
               We are committed to delivering security, speed, and a 
               user-first experience that adapts to your evolving needs. 
               Here's why thousands of users trust us.
              </p>
              
              <div className="aboutus-features-grid">
                {features.map((feature, index) => (
                  <div key={index} className="aboutus-feature-item">
                    <div className="aboutus-feature-icon">✦</div>
                    <div className="aboutus-feature-content">
                      <h3 className="aboutus-feature-title">{feature.title}</h3>
                      <p className="aboutus-feature-description">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )

    },
    {
      id:'team',
      color: '#f59e0b',
      content: (
         <div className="aboutus-container">
          <div className="team-header">
            <h2 className="aboutus-section-title">MEET OUR TEAM</h2>
          </div>
          
          <div className="team-grid">
            {teamMembers.map((member, index) => (
              <div key={index} className="team-card">
                <div className="team-image">
                  <img 
                    src={member.image}
                    alt={member.name}
                    className="member-image"
                  />
                </div>
                <div className="team-info">
                  <h3 className="member-name">{member.name}</h3>
                  <p className="member-role">{member.role}</p>
                  
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    }
  ];

    useEffect(() => {
    let ticking = false;

    const updateCurrentSection = () => {
      const scrollTop = window.scrollY;
      const windowHeight = window.innerHeight;
      
      const newSection = Math.round(scrollTop / windowHeight);
      const clampedSection = Math.max(0, Math.min(sections.length - 1, newSection));
      
      if (clampedSection !== currentSection) {
        setCurrentSection(clampedSection);
      }
    };

    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          updateCurrentSection();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    updateCurrentSection();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [currentSection, sections.length]);

  const navigateToSection = (index) => {
    const targetElement = document.getElementById(`section-${index}`);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const getSectionVisibility = (index) => {
    const scrollTop = window.scrollY;
    const windowHeight = window.innerHeight;
    const sectionTop = index * windowHeight;
    const sectionBottom = sectionTop + windowHeight;
    
    const viewportTop = scrollTop;
    const viewportBottom = scrollTop + windowHeight;
    
    const visibleTop = Math.max(sectionTop, viewportTop);
    const visibleBottom = Math.min(sectionBottom, viewportBottom);
    const visibleHeight = Math.max(0, visibleBottom - visibleTop);
    
    return visibleHeight / windowHeight;
  };

  const getContentStyle = (index) => {
    const visibility = getSectionVisibility(index);
    const isActive = visibility > 0.5;
    
    const baseStyle = {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'transparent',
      pointerEvents: isActive ? 'auto' : 'none',
      zIndex: isActive ? 100 : 10,
      transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
    };

    if (!isActive) {
      return {
        ...baseStyle,
        filter: 'blur(2rem) contrast(4)',
        transform: 'scale(0.8)',
        opacity: 0,
        visibility: 'hidden',
      };
    }

    return {
      ...baseStyle,
      filter: 'blur(0) contrast(1)',
      transform: 'scale(1)',
      opacity: 1,
      visibility: 'visible',
    };
  };

  return (
       <div className="scrollnapping-container">
      <div className="about-page about-page-container" style={{margin: 0, padding: 0}}>
      {/* Hero Banner Section - Starts from very top */}
      <header className="site-header">
          <nav>
            {/* <ul className="indicator">
              {sections.map((_, index) => (
                <li key={index}>
                  <button 
                    className="nav-dot"
                    onClick={() => navigateToSection(index)}
                    aria-label={`Go to section ${index + 1}`}
                  />
                </li>
              ))}
            </ul> */}
          </nav>
        </header>
        {sections.map((section, index) => (
          <div 
            key={section.id} 
            id={`section-${index}`}
            className="scroll-section"
          />
        ))}

        {/* Fixed content overlays */}
        {sections.map((section, index) => (
          <div
            key={`content-${section.id}`}
            style={getContentStyle(index)}
          >
            {section.content}
          </div>
        ))}
      </div>
    </div>
       
  );
};

export default AboutUs;