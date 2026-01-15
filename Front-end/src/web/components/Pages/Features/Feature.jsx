import React, { useState, useEffect , useRef} from 'react';
import './Features.css';
// import FeatureCard from './Featurecard.jsx';
import FeaturesComp from './FeaturesComp.jsx';

const featureGroups = [
  {
    category: 'Security',
    features: [
      { title: 'End-to-End Encryption', description: 'Your files are encrypted from upload to download. Only you can access them.' },
      { title: 'Secure File Sharing', description: 'Share files with encrypted links and controlled access.' },
      { title: 'Temporary Vaults', description: 'Store files temporarily with high security and expiration options.' },
    ],
  },
  {
    category: 'Ease of Use',
    features: [
      { title: 'Real-Time Sync', description: 'Files are instantly updated across all your devices.' },
      { title: 'Smart File Management', description: 'Organize, move, and restore files effortlessly.' },
      { title: 'File Versioning', description: 'Track and recover previous versions of your files.' },
    ],
  },
  {
    category: 'Storage Control',
    features: [
      { title: 'Flexible Pay-Per-GB Storage', description: 'Only pay for the storage you actually use.' },
      { title: 'Recycle Bin & Restore', description: 'Easily recover accidentally deleted files.' },
      { title: 'Storage Insights', description: 'Visualize your storage usage with interactive charts.' },
    ],
  },
];

const featureCarousel = [
  {
    title: 'Seamless File Sync',
    description: 'Keep your files updated across all your devices in real-time with StormDrive.',
  },
  {
    title: 'Secure Sharing',
    description: 'Share files with confidence using encrypted links and controlled access.',
  },
  {
    title: 'Smart Storage Management',
    description: 'Track, organize, and restore files effortlessly with our intuitive dashboard.',
  },
];

export default function Features() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [activeIndex, setActiveIndex] = useState(0);
//    const [currentIndex, setCurrentIndex] = useState(0);
//   const [expandedCard, setExpandedCard] = useState(null);
//   const autoAdvanceRef = useRef(null);
//   const carouselWrapperRef = useRef(null);

//   const totalCards = destinations.length;
//   const visibleCards = 2;
//   const maxIndex = Math.max(0, totalCards - visibleCards);

//    const getCardWidth = () => {
//     return window.innerWidth <= 640 ? 220 : 
//            window.innerWidth <= 968 ? 260 : 300;
//   };

//     const updateCarousel = () => {
//     const cardWidth = getCardWidth();
//     const offset = -currentIndex * cardWidth;
    
//     const cardsContainer = document.querySelector('.destination-cards');
//     if (cardsContainer) {
//       cardsContainer.style.transform = `translateX(${offset}px)`;
//     }
//   };


//     // Navigation functions
//   const nextCard = () => {
//     setCurrentIndex(prevIndex => 
//       prevIndex >= maxIndex ? 0 : prevIndex + 1
//     );
//   };

//   const prevCard = () => {
//     setCurrentIndex(prevIndex => 
//       prevIndex <= 0 ? maxIndex : prevIndex - 1
//     );
//   };

//   // Expand card functionality
//   const expandCard = (destination) => {
//     setExpandedCard(destination);
//     clearInterval(autoAdvanceRef.current);
//   };

//   const closeCard = () => {
//     setExpandedCard(null);
//     startAutoAdvance();
//   };

//   // Auto-advance functionality
//   const startAutoAdvance = () => {
//     clearInterval(autoAdvanceRef.current);
//     autoAdvanceRef.current = setInterval(nextCard, 3000);
//   };

//   // Effects
//   useEffect(() => {
//     updateCarousel();
//   }, [currentIndex]);

//   useEffect(() => {
//     startAutoAdvance();
    
//     return () => {
//       clearInterval(autoAdvanceRef.current);
//     };
//   }, []);

//   useEffect(() => {
//     const handleKeyDown = (e) => {
//       if (e.key === 'Escape' && expandedCard) {
//         closeCard();
//       }
//       if (e.key === 'ArrowLeft') prevCard();
//       if (e.key === 'ArrowRight') nextCard();
//     };

//     const handleResize = () => {
//       updateCarousel();
//     };

//     document.addEventListener('keydown', handleKeyDown);
//     window.addEventListener('resize', handleResize);

//     return () => {
//       document.removeEventListener('keydown', handleKeyDown);
//       window.removeEventListener('resize', handleResize);
//     };
//   }, [expandedCard]);

//   // Carousel hover handlers
//   const handleMouseEnter = () => {
//     clearInterval(autoAdvanceRef.current);
//   };

//   const handleMouseLeave = () => {
//     if (!expandedCard) {
//       startAutoAdvance();
//     }
//   };


  useEffect(() => {
    const handleMouseMove = (event) => {
      setMousePosition({ x: event.clientX, y: event.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);


  return (
    <div className="stormdrive-features-page-container">
      <div
        className="stormdrive-cursor-glow"
        style={{ left: `${mousePosition.x}px`, top: `${mousePosition.y}px` }}
      ></div>

      {/* Hero Section */}
      {/* <div className="stormdrive-features-hero-section stormdrive-gradient-background">
        <div className="stormdrive-features-hero-content">
          <h1 className="stormdrive-features-hero-title">F E A T U R E S</h1>
          <p className="stormdrive-features-hero-subtitle">
            Experience seamless file storage with instant access, advanced security, and total control at your fingertips.
          </p>
          <div className="storm-hero-visual">
            <img src='/images/features.png' alt='features'/>
          </div>
        </div>
      </div> */}
      <section className="storm-hero">
        <div className="storm-hero-wrap">
          <div className="storm-hero-text">
            <h1>F E A T U R E S</h1>
            <p>
              Experience seamless file storage with instant access, advanced security, and total control at your fingertips.
            </p>
          </div>
          <div className="storm-hero-visual">
            <img className='feature-illustration' src='/images/features.png' alt='features'/>
          </div>
        </div>
      </section>


      {/* <div className="destination-carousel-container">
        {expandedCard && (
        <div className="expanded-card-overlay">
          <div className={`destination-card card-expanded ${expandedCard.className}`}>
            <div className="card-bg"></div>
            <div className="card-content">
              <div className="expanded-location">{expandedCard.location}</div>
              <div className="card-title">
                {expandedCard.title.split('\n').map((line, i) => (
                  <React.Fragment key={i}>
                    {line}
                    {i === 0 && <br />}
                  </React.Fragment>
                ))}
              </div>
              <div className="expanded-description">{expandedCard.description}</div>
            </div>
            <div className="close-button" onClick={closeCard}>×</div>
          </div>
        </div>
      )}

      <div className="cards-container">

        
        <div 
          className="carousel-wrapper"
          ref={carouselWrapperRef}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="destination-cards">
            {destinations.map((destination) => (
              <div
                key={destination.id}
                className={`destination-card ${destination.className}`}
                onClick={() => expandCard(destination)}
              >
                <div className="card-bg"></div>
                <div className="card-content">
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

      {/* Expanded Card Modal */}
      {/* {expandedCard && (
        <div className="expanded-card-overlay">
          <div className={`destination-card card-expanded ${expandedCard.className}`}>
            <div className="card-bg"></div>
            <div className="card-content">
              <div className="expanded-location">{expandedCard.location}</div>
              <div className="card-title">
                {expandedCard.title.split('\n').map((line, i) => (
                  <React.Fragment key={i}>
                    {line}
                    {i === 0 && <br />}
                  </React.Fragment>
                ))}
              </div>
              <div className="expanded-description">{expandedCard.description}</div>
            </div>
            <div className="close-button" onClick={closeCard}>×</div>
          </div>
        </div>
      )} */} 

      <FeaturesComp/>

      



    </div>
  );
}

