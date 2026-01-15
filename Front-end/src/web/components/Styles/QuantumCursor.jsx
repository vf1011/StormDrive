// src/components/QuantumCursor/QuantumShieldCursor.jsx
import React, { useEffect, useRef, useState } from 'react';
import './QuantumCursor.css';

const QuantumShieldCursor = () => {
  const coreRef = useRef(null);
  const ring1Ref = useRef(null);
  const ring2Ref = useRef(null);
  const ring3Ref = useRef(null);
  const fieldRef = useRef(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const lastParticleTime = useRef(0);

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
      
      // Create movement particles (throttled)
      if (Date.now() - lastParticleTime.current > 150) {
        createQuantumParticle(e.clientX, e.clientY);
        lastParticleTime.current = Date.now();
      }
    };

    const handleClick = (e) => {
      triggerBurst(e.clientX, e.clientY);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('click', handleClick);

    // Create ambient particles
    const ambientInterval = setInterval(() => {
      createAmbientParticle();
    }, 800);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('click', handleClick);
      clearInterval(ambientInterval);
    };
  }, []);

  // Update cursor position
  useEffect(() => {
    if (coreRef.current) {
      coreRef.current.style.left = mousePosition.x - 12 + 'px';
      coreRef.current.style.top = mousePosition.y - 12 + 'px';
    }
    if (ring1Ref.current) {
      ring1Ref.current.style.left = mousePosition.x - 25 + 'px';
      ring1Ref.current.style.top = mousePosition.y - 25 + 'px';
    }
    if (ring2Ref.current) {
      ring2Ref.current.style.left = mousePosition.x - 35 + 'px';
      ring2Ref.current.style.top = mousePosition.y - 35 + 'px';
    }
    if (ring3Ref.current) {
      ring3Ref.current.style.left = mousePosition.x - 45 + 'px';
      ring3Ref.current.style.top = mousePosition.y - 45 + 'px';
    }
    if (fieldRef.current) {
      fieldRef.current.style.left = mousePosition.x - 75 + 'px';
      fieldRef.current.style.top = mousePosition.y - 75 + 'px';
    }
  }, [mousePosition]);

  const createQuantumParticle = (x, y) => {
    const particle = document.createElement('div');
    particle.className = 'quantum-particle';
    
    const offsetX = (Math.random() - 0.5) * 40;
    const offsetY = (Math.random() - 0.5) * 40;
    
    particle.style.left = x + offsetX + 'px';
    particle.style.top = y + offsetY + 'px';
    
    const qx = (Math.random() - 0.5) * 80;
    const qy = (Math.random() - 0.5) * 80;
    particle.style.setProperty('--qx', qx + 'px');
    particle.style.setProperty('--qy', qy + 'px');
    
    document.body.appendChild(particle);
    
    setTimeout(() => {
      if (particle.parentNode) {
        particle.parentNode.removeChild(particle);
      }
    }, 2500);
  };

  const createAmbientParticle = () => {
    const x = Math.random() * window.innerWidth;
    const y = Math.random() * window.innerHeight;
    createQuantumParticle(x, y);
  };

  const triggerBurst = (x, y) => {
    for (let i = 0; i < 12; i++) {
      setTimeout(() => {
        const burst = document.createElement('div');
        burst.className = 'quantum-burst';
        
        burst.style.left = x + 'px';
        burst.style.top = y + 'px';
        
        const angle = (i / 12) * 2 * Math.PI;
        const distance = 60 + Math.random() * 40;
        const bx = Math.cos(angle) * distance;
        const by = Math.sin(angle) * distance;
        
        burst.style.setProperty('--bx', bx + 'px');
        burst.style.setProperty('--by', by + 'px');
        
        document.body.appendChild(burst);
        
        setTimeout(() => {
          if (burst.parentNode) {
            burst.parentNode.removeChild(burst);
          }
        }, 1500);
      }, i * 50);
    }

    // Enhance core animation temporarily
    if (coreRef.current) {
      coreRef.current.style.animation = 'quantumPulse 0.5s ease-in-out 3';
      setTimeout(() => {
        if (coreRef.current) {
          coreRef.current.style.animation = 'quantumPulse 2s ease-in-out infinite';
        }
      }, 1500);
    }
  };

  return (
    <>
      <div ref={coreRef} className="quantum-core" />
      <div ref={ring1Ref} className="quantum-ring quantum-ring-1" />
      <div ref={ring2Ref} className="quantum-ring quantum-ring-2" />
      <div ref={ring3Ref} className="quantum-ring quantum-ring-3" />
      <div ref={fieldRef} className="quantum-field" />
    </>
  );
};

export default QuantumShieldCursor;