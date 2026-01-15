// import React, { useState, useEffect , useRef} from 'react';

// const destinations = [
//     {
//       id: 'goreme',
//       location: 'Cappadocia - Turkey',
//       title: 'GÖREME\nVALLEY',
//       description: 'Experience magical hot air balloon rides over fairy chimneys and ancient cave dwellings in this UNESCO World Heritage site.',
//       className: 'card-goreme'
//     },
//     {
//       id: 'yosemite',
//       location: 'California - USA',
//       title: 'YOSEMITE\nNATIONAL PARK',
//       description: 'Iconic granite cliffs, giant sequoias, and pristine wilderness in one of America\'s most beloved national parks.',
//       className: 'card-yosemite'
//     },
//     {
//       id: 'lances',
//       location: 'Tarifa - Spain',
//       title: 'LOS LANCES\nBEACH',
//       description: 'Discover magnificent wind and wave conditions. Amazing beaches where the Atlantic meets the Mediterranean Sea.',
//       className: 'card-lances'
//     },
//     {
//       id: 'marrakech',
//       location: 'Morocco - Africa',
//       title: 'MARRAKECH\nMERZOUGA',
//       description: 'Journey from the vibrant souks of Marrakech to the golden dunes of the Sahara Desert for an unforgettable adventure.',
//       className: 'card-marrakech'
//     },
//     {
//       id: 'nagano',
//       location: 'Honshu - Japan',
//       title: 'NAGANO\nPREFECTURE',
//       description: 'Home to the Japanese Alps, world-class skiing, hot springs, and the famous snow monkeys of Jigokudani.',
//       className: 'card-nagano'
//     },
//     {
//       id: 'goreme',
//       location: 'Cappadocia - Turkey',
//       title: 'GÖREME\nVALLEY',
//       description: 'Experience magical hot air balloon rides over fairy chimneys and ancient cave dwellings in this UNESCO World Heritage site.',
//       className: 'card-goreme'
//     },
//     {
//       id: 'yosemite',
//       location: 'California - USA',
//       title: 'YOSEMITE\nNATIONAL PARK',
//       description: 'Iconic granite cliffs, giant sequoias, and pristine wilderness in one of America\'s most beloved national parks.',
//       className: 'card-yosemite'
//     },
//     {
//       id: 'lances',
//       location: 'Tarifa - Spain',
//       title: 'LOS LANCES\nBEACH',
//       description: 'Discover magnificent wind and wave conditions. Amazing beaches where the Atlantic meets the Mediterranean Sea.',
//       className: 'card-lances'
//     },
//     {
//       id: 'marrakech',
//       location: 'Morocco - Africa',
//       title: 'MARRAKECH\nMERZOUGA',
//       description: 'Journey from the vibrant souks of Marrakech to the golden dunes of the Sahara Desert for an unforgettable adventure.',
//       className: 'card-marrakech'
//     },
//     {
//       id: 'nagano',
//       location: 'Honshu - Japan',
//       title: 'NAGANO\nPREFECTURE',
//       description: 'Home to the Japanese Alps, world-class skiing, hot springs, and the famous snow monkeys of Jigokudani.',
//       className: 'card-nagano'
//     }
//   ];


// function Featuresection() {

//   const [currentIndex, setCurrentIndex] = useState(0);
//     const [expandedCard, setExpandedCard] = useState(null);
//     const autoAdvanceRef = useRef(null);
//     const carouselWrapperRef = useRef(null);
  
//     const totalCards = destinations.length;
//     const visibleCards = 2;
//     const maxIndex = Math.max(0, totalCards - visibleCards);
  
//      const getCardWidth = () => {
//       return window.innerWidth <= 640 ? 220 : 
//              window.innerWidth <= 968 ? 260 : 300;
//     };
  
//       const updateCarousel = () => {
//       const cardWidth = getCardWidth();
//       const offset = -currentIndex * cardWidth;
      
//       const cardsContainer = document.querySelector('.destination-cards');
//       if (cardsContainer) {
//         cardsContainer.style.transform = `translateX(${offset}px)`;
//       }
//     };
  
  
//       // Navigation functions
//     const nextCard = () => {
//       setCurrentIndex(prevIndex => 
//         prevIndex >= maxIndex ? 0 : prevIndex + 1
//       );
//     };
  
//     const prevCard = () => {
//       setCurrentIndex(prevIndex => 
//         prevIndex <= 0 ? maxIndex : prevIndex - 1
//       );
//     };
  
//     // Expand card functionality
//     const expandCard = (destination) => {
//       setExpandedCard(destination);
//       clearInterval(autoAdvanceRef.current);
//     };
  
//     const closeCard = () => {
//       setExpandedCard(null);
//       startAutoAdvance();
//     };
  
//     // Auto-advance functionality
//     const startAutoAdvance = () => {
//       clearInterval(autoAdvanceRef.current);
//       autoAdvanceRef.current = setInterval(nextCard, 3000);
//     };
  
//     // Effects
//     useEffect(() => {
//       updateCarousel();
//     }, [currentIndex]);
  
//     useEffect(() => {
//       startAutoAdvance();
      
//       return () => {
//         clearInterval(autoAdvanceRef.current);
//       };
//     }, []);
  
//     useEffect(() => {
//       const handleKeyDown = (e) => {
//         if (e.key === 'Escape' && expandedCard) {
//           closeCard();
//         }
//         if (e.key === 'ArrowLeft') prevCard();
//         if (e.key === 'ArrowRight') nextCard();
//       };
  
//       const handleResize = () => {
//         updateCarousel();
//       };
  
//       document.addEventListener('keydown', handleKeyDown);
//       window.addEventListener('resize', handleResize);
  
//       return () => {
//         document.removeEventListener('keydown', handleKeyDown);
//         window.removeEventListener('resize', handleResize);
//       };
//     }, [expandedCard]);
  
//     // Carousel hover handlers
//     const handleMouseEnter = () => {
//       clearInterval(autoAdvanceRef.current);
//     };
  
//     const handleMouseLeave = () => {
//       if (!expandedCard) {
//         startAutoAdvance();
//       }
//     };

//     return(
//         <div className="destination-carousel-container">
        
//               <div className="cards-container">
        
                
//                 <div 
//                   className="carousel-wrapper"
//                   ref={carouselWrapperRef}
//                   onMouseEnter={handleMouseEnter}
//                   onMouseLeave={handleMouseLeave}
//                 >
//                   <div className="destination-cards">
//                     {destinations.map((destination) => (
//                       <div
//                         key={destination.id}
//                         className={`destination-card ${destination.className}`}
//                         onClick={() => expandCard(destination)}
//                       >
//                         <div className="card-bg"></div>
//                         <div className="card-content">
//                           <div className="card-title">
//                             {destination.title.split('\n').map((line, i) => (
//                               <React.Fragment key={i}>
//                                 {line}
//                                 {i === 0 && <br />}
//                               </React.Fragment>
//                             ))}
//                           </div>
//                         </div>
//                       </div>
//                     ))}
//                   </div>
//                 </div>
//               </div>
        
//               <div className="navigation-controls">
//                 <div className="nav-arrow nav-prev" onClick={prevCard}>‹</div>
//                 <div className="progress-bar">
//                   <div 
//                     className="progress-fill"
//                     style={{ width: `${((currentIndex + 1) / totalCards) * 100}%` }}
//                   ></div>
//                 </div>
//                 <div className="nav-arrow nav-next" onClick={nextCard}>›</div>
//                 <div className="slide-counter">{(currentIndex + 1).toString().padStart(2, '0')}</div>
//               </div>
        
//               {/* Expanded Card Modal */}
//               {expandedCard && (
//                 <div className="expanded-card-overlay">
//                   <div className={`destination-card card-expanded ${expandedCard.className}`}>
//                     <div className="card-bg"></div>
//                     <div className="card-content">
//                       <div className="expanded-location">{expandedCard.location}</div>
//                       <div className="card-title">
//                         {expandedCard.title.split('\n').map((line, i) => (
//                           <React.Fragment key={i}>
//                             {line}
//                             {i === 0 && <br />}
//                           </React.Fragment>
//                         ))}
//                       </div>
//                       <div className="expanded-description">{expandedCard.description}</div>
//                     </div>
//                     <div className="close-button" onClick={closeCard}>×</div>
//                   </div>
//                 </div>
//               )}
//             </div>
   
// )

// }

// export default Featuresection;
  
import React, { useState, useEffect, useRef } from 'react';
import './Feature_section.css';

const Featuresection = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [expandedCard, setExpandedCard] = useState(null);
  const [activeDestination, setActiveDestination] = useState(0);
  const autoAdvanceRef = useRef(null);
  const carouselWrapperRef = useRef(null);

  const destinations = [
    {
    id: 'sync',
    category: 'Sync',
    title: 'Seamless File Sync',
    description: 'Keep your files updated across all your devices in real-time with StormDrive.',
    icon: 'RefreshCcw',
    backgroundImage: 'https://images.unsplash.com/photo-1669060475985-e72f27a63241?q=80&w=3132&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
  },
  {
    id: 'security',
    category: 'Security',
    title: 'Secure Sharing',
    description: 'Share files with confidence using encrypted links and controlled access.',
    icon: 'ShieldCheck',
    backgroundImage: '/images/security.jpg'
  },
  {
    id: 'management',
    category: 'Management',
    title: 'Smart Storage Management',
    description: 'Track, organize, and restore files effortlessly with our intuitive dashboard.',
    icon: 'Folder',
    backgroundImage: '/images/management.jpg'
  },
  {
    id: 'pricing',
    category: 'Pricing',
    title: 'Flexible Pay-Per-GB Pricing',
    description: 'Only pay for the storage you actually use. No hidden costs.',
    icon: 'DollarSign',
    backgroundImage: '/images/pricing.jpg'
  },
  {
    id: 'versioning',
    category: 'Versioning',
    title: 'File Versioning',
    description: 'Easily access and restore previous versions of your files with a click.',
    icon: 'Clock',
    backgroundImage: '/images/versioning.jpg'
  },
  {
    id: 'recovery',
    category: 'Recovery',
    title: 'Recycle Bin & Quick Restore',
    description: 'Recover accidentally deleted files quickly from your personal recycle bin.',
    icon: 'RotateCcw',
    backgroundImage: '/images/recovery.jpg'
  }
  ];

  const totalCards = destinations.length;
  const visibleCards = 2;
  const maxIndex = Math.max(0, totalCards - visibleCards);

  // Get card width based on screen size
  const getCardWidth = () => {
    return window.innerWidth <= 640 ? 220 : 
           window.innerWidth <= 968 ? 260 : 300;
  };

  // Update carousel position
  const updateCarousel = () => {
    const cardWidth = getCardWidth();
    const offset = -currentIndex * cardWidth;
    
    const cardsContainer = document.querySelector('.destination-cards');
    if (cardsContainer) {
      cardsContainer.style.transform = `translateX(${offset}px)`;
    }
  };

  // Navigation functions
  const nextCard = () => {
    setCurrentIndex(prevIndex => 
      prevIndex >= maxIndex ? 0 : prevIndex + 1
    );
  };

  const prevCard = () => {
    setCurrentIndex(prevIndex => 
      prevIndex <= 0 ? maxIndex : prevIndex - 1
    );
  };

  // Expand card functionality
  const expandCard = (destination, index) => {
    setExpandedCard(destination);
    setActiveDestination(index);
    clearInterval(autoAdvanceRef.current);
  };

  const closeCard = () => {
    setExpandedCard(null);
    startAutoAdvance();
  };

  // Auto-advance functionality
  const startAutoAdvance = () => {
    clearInterval(autoAdvanceRef.current);
    autoAdvanceRef.current = setInterval(nextCard, 4000);
  };

  // Effects
  useEffect(() => {
    updateCarousel();
  }, [currentIndex]);

  useEffect(() => {
    startAutoAdvance();
    
    return () => {
      clearInterval(autoAdvanceRef.current);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && expandedCard) {
        closeCard();
      }
      if (e.key === 'ArrowLeft') prevCard();
      if (e.key === 'ArrowRight') nextCard();
    };

    const handleResize = () => {
      updateCarousel();
    };

    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
    };
  }, [expandedCard]);

  // Carousel hover handlers
  const handleMouseEnter = () => {
    clearInterval(autoAdvanceRef.current);
  };

  const handleMouseLeave = () => {
    if (!expandedCard) {
      startAutoAdvance();
    }
  };

  const currentDestination = expandedCard || destinations[activeDestination];

  return (
    <div 
      className="travel-hero-layout"
      style={{
        background: `${currentDestination.heroImage}, linear-gradient(135deg, rgba(0,0,0,0.4), rgba(0,0,0,0.6))`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundBlendMode: 'overlay',
        transition: 'all 1s ease'
      }}
    >

      {/* Hero Content */}
      <main className="feature-hero-content">
        <div className="destination-info">
          <div className="location-tag">{currentDestination.location}</div>
          <h1 className="destination-title">
            {currentDestination.title.split('\n').map((line, i) => (
              <React.Fragment key={i}>
                {line}
                {i === 0 && <br />}
              </React.Fragment>
            ))}
          </h1>
          <p className="destination-description">
            {currentDestination.description}
          </p>
        </div>
        
        <div className="cards-container">
          <div 
            className="carousel-wrapper"
            ref={carouselWrapperRef}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <div className="destination-cards">
              {destinations.map((destination, index) => (
                <div
                  key={destination.id}
                  className={`destination-card ${destination.className}`}
                  onClick={() => expandCard(destination, index)}
                >
                  <div className="card-bg"></div>
                  <div className="card-content">
                    <div className="card-location">{destination.location}</div>
                    <div className="card-title">
                      {destination.title.split('\n').map((line, i) => (
                        <React.Fragment key={i}>
                          {line}
                          {i === 0 && <br />}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        
      </main>

        {/* Navigation Controls */}
      <div className="navigation-controls">
        <div className="nav-arrow nav-prev" onClick={prevCard}>‹</div>
        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ width: `${((currentIndex + 1) / totalCards) * 100}%` }}
          ></div>
        </div>
        <div className="nav-arrow nav-next" onClick={nextCard}>›</div>
        <div className="slide-counter">{(currentIndex + 1).toString().padStart(2, '0')}</div>
      </div>


    </div>
  );
};

export default Featuresection;