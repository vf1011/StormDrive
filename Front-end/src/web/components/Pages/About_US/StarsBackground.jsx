import React, { useEffect, useRef } from 'react';

const StarsBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Stars animation settings
    const particleCount = 40;
    const flareCount = 10;
    const motion = 0.05;
    const tilt = 0.05;
    const color = '#FFEED4';
    const particleSizeBase = 1;
    const particleSizeMultiplier = 0.5;
    const flareSizeBase = 100;
    const flareSizeMultiplier = 100;
    const lineWidth = 1;
    const linkChance = 75;
    const linkLengthMin = 5;
    const linkLengthMax = 7;
    const linkOpacity = 0.25;
    const linkFade = 90;
    const linkSpeed = 1;
    const glareAngle = -60;
    const glareOpacityMultiplier = 0.05;
    const renderParticles = true;
    const renderParticleGlare = true;
    const renderFlares = true;
    const renderLinks = true;
    const renderMesh = false;
    const flicker = true;
    const flickerSmoothing = 15;
    const blurSize = 0;
    const orbitTilt = true;
    const randomMotion = true;
    const noiseLength = 1000;
    const noiseStrength = 1;

    const context = canvas.getContext('2d');
    const mouse = { x: 0, y: 0 };
    let r = 0;
    const c = 1000;
    let n = 0;
    const nAngle = (Math.PI * 2) / noiseLength;
    const nRad = 100;
    const nScale = 0.5;
    let nPos = { x: 0, y: 0 };
    const points = [];
    const vertices = [];
    const triangles = [];
    const links = [];
    const particles = [];
    const flares = [];

    // Utility functions
    function random(min, max, float) {
      return float ?
        Math.random() * (max - min) + min :
        Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function noisePoint(i) {
      const a = nAngle * i;
      const cosA = Math.cos(a);
      const sinA = Math.sin(a);
      const rad = nRad;
      return {
        x: rad * cosA,
        y: rad * sinA
      };
    }

    function position(x, y, z) {
      return {
        x: (x * canvas.width) + ((((canvas.width / 2) - mouse.x + ((nPos.x - 0.5) * noiseStrength)) * z) * motion),
        y: (y * canvas.height) + ((((canvas.height / 2) - mouse.y + ((nPos.y - 0.5) * noiseStrength)) * z) * motion)
      };
    }

    function sizeRatio() {
      return canvas.width >= canvas.height ? canvas.width : canvas.height;
    }

    // Particle class
    class Particle {
      constructor() {
        this.x = random(-0.1, 1.1, true);
        this.y = random(-0.1, 1.1, true);
        this.z = random(0, 4);
        this.color = color;
        this.opacity = random(0.1, 1, true);
        this.flicker = 0;
        this.neighbors = [];
      }

      render() {
        const pos = position(this.x, this.y, this.z);
        const radius = ((this.z * particleSizeMultiplier) + particleSizeBase) * (sizeRatio() / 1000);
        let opacity = this.opacity;

        if (flicker) {
          const newVal = random(-0.5, 0.5, true);
          this.flicker += (newVal - this.flicker) / flickerSmoothing;
          if (this.flicker > 0.5) this.flicker = 0.5;
          if (this.flicker < -0.5) this.flicker = -0.5;
          opacity += this.flicker;
          if (opacity > 1) opacity = 1;
          if (opacity < 0) opacity = 0;
        }

        context.fillStyle = this.color;
        context.globalAlpha = opacity;
        context.beginPath();
        context.arc(pos.x, pos.y, radius, 0, 2 * Math.PI, false);
        context.fill();
        context.closePath();

        if (renderParticleGlare) {
          context.globalAlpha = opacity * glareOpacityMultiplier;
          context.beginPath();
          context.ellipse(pos.x, pos.y, radius * 100, radius, (glareAngle - ((nPos.x - 0.5) * noiseStrength * motion)) * (Math.PI / 180), 0, 2 * Math.PI, false);
          context.fill();
          context.closePath();
        }

        context.globalAlpha = 1;
      }
    }

    // Flare class
    class Flare {
      constructor() {
        this.x = random(-0.25, 1.25, true);
        this.y = random(-0.25, 1.25, true);
        this.z = random(0, 2);
        this.color = color;
        this.opacity = random(0.001, 0.01, true);
      }

      render() {
        const pos = position(this.x, this.y, this.z);
        const radius = ((this.z * flareSizeMultiplier) + flareSizeBase) * (sizeRatio() / 1000);

        context.beginPath();
        context.globalAlpha = this.opacity;
        context.arc(pos.x, pos.y, radius, 0, 2 * Math.PI, false);
        context.fillStyle = this.color;
        context.fill();
        context.closePath();
        context.globalAlpha = 1;
      }
    }

    // Link class
    class Link {
      constructor(startVertex, numPoints) {
        this.length = numPoints;
        this.verts = [startVertex];
        this.stage = 0;
        this.linked = [startVertex];
        this.distances = [];
        this.traveled = 0;
        this.fade = 0;
        this.finished = false;
      }

      render() {
        let i, p, pos, points;

        switch (this.stage) {
          case 0:
            const last = particles[this.verts[this.verts.length - 1]];
            if (last && last.neighbors && last.neighbors.length > 0) {
              const neighbor = last.neighbors[random(0, last.neighbors.length - 1)];
              if (this.verts.indexOf(neighbor) === -1) {
                this.verts.push(neighbor);
              }
            } else {
              this.stage = 3;
              this.finished = true;
            }

            if (this.verts.length >= this.length) {
              for (i = 0; i < this.verts.length - 1; i++) {
                const p1 = particles[this.verts[i]];
                const p2 = particles[this.verts[i + 1]];
                const dx = p1.x - p2.x;
                const dy = p1.y - p2.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                this.distances.push(dist);
              }
              this.stage = 1;
            }
            break;

          case 1:
            if (this.distances.length > 0) {
              points = [];
              for (i = 0; i < this.linked.length; i++) {
                p = particles[this.linked[i]];
                pos = position(p.x, p.y, p.z);
                points.push([pos.x, pos.y]);
              }

              const linkSpeedRel = linkSpeed * 0.00001 * canvas.width;
              this.traveled += linkSpeedRel;
              const d = this.distances[this.linked.length - 1];

              if (this.traveled >= d) {
                this.traveled = 0;
                this.linked.push(this.verts[this.linked.length]);
                p = particles[this.linked[this.linked.length - 1]];
                pos = position(p.x, p.y, p.z);
                points.push([pos.x, pos.y]);

                if (this.linked.length >= this.verts.length) {
                  this.stage = 2;
                }
              } else {
                const a = particles[this.linked[this.linked.length - 1]];
                const b = particles[this.verts[this.linked.length]];
                const t = d - this.traveled;
                const x = ((this.traveled * b.x) + (t * a.x)) / d;
                const y = ((this.traveled * b.y) + (t * a.y)) / d;
                const z = ((this.traveled * b.z) + (t * a.z)) / d;

                pos = position(x, y, z);
                points.push([pos.x, pos.y]);
              }

              this.drawLine(points);
            } else {
              this.stage = 3;
              this.finished = true;
            }
            break;

          case 2:
            if (this.verts.length > 1) {
              if (this.fade < linkFade) {
                this.fade++;
                points = [];
                const alpha = (1 - (this.fade / linkFade)) * linkOpacity;
                for (i = 0; i < this.verts.length; i++) {
                  p = particles[this.verts[i]];
                  pos = position(p.x, p.y, p.z);
                  points.push([pos.x, pos.y]);
                }
                this.drawLine(points, alpha);
              } else {
                this.stage = 3;
                this.finished = true;
              }
            } else {
              this.stage = 3;
              this.finished = true;
            }
            break;

          case 3:
          default:
            this.finished = true;
            break;
        }
      }

      drawLine(points, alpha) {
        if (typeof alpha !== 'number') alpha = linkOpacity;

        if (points.length > 1 && alpha > 0) {
          context.globalAlpha = alpha;
          context.beginPath();
          for (let i = 0; i < points.length - 1; i++) {
            context.moveTo(points[i][0], points[i][1]);
            context.lineTo(points[i + 1][0], points[i + 1][1]);
          }
          context.strokeStyle = color;
          context.lineWidth = lineWidth;
          context.stroke();
          context.closePath();
          context.globalAlpha = 1;
        }
      }
    }

    // Simple Delaunay triangulation (simplified version)
    function triangulate(points) {
      const vertices = [];
      // Simplified triangulation - for production use a proper Delaunay library
      for (let i = 0; i < points.length - 2; i++) {
        vertices.push(i, i + 1, i + 2);
      }
      return vertices;
    }

    function startLink(vertex, length) {
      links.push(new Link(vertex, length));
    }

    function resize() {
      canvas.width = window.innerWidth * (window.devicePixelRatio || 1);
      canvas.height = canvas.width * (canvas.clientHeight / canvas.clientWidth);
    }

    function render() {
      if (randomMotion) {
        n++;
        if (n >= noiseLength) {
          n = 0;
        }
        nPos = noisePoint(n);
      }

      context.clearRect(0, 0, canvas.width, canvas.height);

      if (blurSize > 0) {
        context.shadowBlur = blurSize;
        context.shadowColor = color;
      }

      if (renderParticles) {
        for (let i = 0; i < particleCount; i++) {
          particles[i].render();
        }
      }

      if (renderLinks) {
        if (random(0, linkChance) === linkChance) {
          const length = random(linkLengthMin, linkLengthMax);
          const start = random(0, particles.length - 1);
          startLink(start, length);
        }

        for (let l = links.length - 1; l >= 0; l--) {
          if (links[l] && !links[l].finished) {
            links[l].render();
          } else {
            links.splice(l, 1);
          }
        }
      }

      if (renderFlares) {
        for (let j = 0; j < flareCount; j++) {
          flares[j].render();
        }
      }
    }

    function init() {
      resize();

      mouse.x = canvas.clientWidth / 2;
      mouse.y = canvas.clientHeight / 2;

      // Create particles
      for (let i = 0; i < particleCount; i++) {
        const p = new Particle();
        particles.push(p);
        points.push([p.x * c, p.y * c]);
      }

      // Simple triangulation
      const triangulatedVertices = triangulate(points);
      for (let i = 0; i < triangulatedVertices.length; i += 3) {
        triangles.push([triangulatedVertices[i], triangulatedVertices[i + 1], triangulatedVertices[i + 2]]);
      }

      // Set up neighbors
      for (let i = 0; i < particles.length; i++) {
        for (let j = 0; j < triangles.length; j++) {
          const k = triangles[j].indexOf(i);
          if (k !== -1) {
            triangles[j].forEach((value) => {
              if (value !== i && particles[i].neighbors.indexOf(value) === -1) {
                particles[i].neighbors.push(value);
              }
            });
          }
        }
      }

      // Create flares
      if (renderFlares) {
        for (let i = 0; i < flareCount; i++) {
          flares.push(new Flare());
        }
      }

      // Mouse/touch events
      const handleMouseMove = (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
      };

      const handleTouchMove = (e) => {
        if (e.touches && e.touches[0]) {
          mouse.x = e.touches[0].clientX;
          mouse.y = e.touches[0].clientY;
        }
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('touchmove', handleTouchMove);

      // Animation loop
      function animloop() {
        requestAnimationFrame(animloop);
        resize();
        render();
      }
      animloop();

      // Cleanup function
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('touchmove', handleTouchMove);
      };
    }

    init();
  }, []);

  return (
    <div className="stars-background">
      <canvas ref={canvasRef} id="stars" />
    </div>
  );
};