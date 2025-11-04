import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import ProjectileMotionSimulator from './ProjectileMotionSimulator';
import { Maximize2, Minimize2 } from 'lucide-react';

interface ProjectileMotionSimulatorWrapperProps {
  // Props can be added here if needed in the future
}

const ProjectileMotionSimulatorWrapper: React.FC<ProjectileMotionSimulatorWrapperProps> = () => {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isChartOpen, setIsChartOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  
  // Track window size to detect mobile
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const handleChartOpenChange = (isOpen: boolean) => {
    setIsChartOpen(isOpen);
  };

  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };

  // ESC key to exit full screen
  useEffect(() => {
    if (!isFullScreen) return;

    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.keyCode === 27) {
        event.preventDefault();
        event.stopPropagation();
        setIsFullScreen(false);
      }
    };

    // Use capture phase to ensure we catch the event early
    window.addEventListener('keydown', handleEscKey, true);
    return () => {
      window.removeEventListener('keydown', handleEscKey, true);
    };
  }, [isFullScreen]);

  // Single persistent instance - render inside containers but with stable key to prevent unmounting
  return (
    <>
      {/* Fullscreen Container - Rendered via Portal to document.body to overlay everything */}
      {isFullScreen && createPortal(
        <div className="fixed inset-0 z-[300] bg-black overflow-hidden">
          {/* Top Right Buttons Container - Exit Full Screen - Hide when chart is open on mobile */}
          <div 
            className={`absolute top-4 right-4 z-[100] flex flex-row gap-2 items-center transition-opacity`}
            style={{ display: isMobile && isChartOpen ? 'none' : 'flex' }}
          >
            <button
              onClick={toggleFullScreen}
              className="text-white px-4 py-2 rounded-lg font-semibold transition shadow-lg flex items-center justify-center hover:opacity-80"
              aria-label="Exit Full Screen"
            >
              <Minimize2 className="w-6 h-6" />
            </button>
          </div>
          <div className="w-full h-full" style={{ width: '100vw', height: '100vh' }}>
            {/* Single persistent instance - stable key prevents unmounting when prop changes */}
            <ProjectileMotionSimulator 
              isEmbedded={false} 
              onChartOpenChange={handleChartOpenChange} 
            />
          </div>
        </div>,
        document.body
      )}

      {/* Embedded Container - Only visible when isFullScreen is false */}
      {!isFullScreen && (
        <div>
          {/* Top Right Buttons Container - Full Screen - Hide when chart is open on mobile */}
          <div 
            className={`absolute top-4 right-4 z-10 flex flex-row gap-2 items-center ${isMobile && isChartOpen ? 'hidden' : ''} transition-opacity`}
            style={{ display: isMobile && isChartOpen ? 'none' : 'flex' }}
          >
            <button
              onClick={toggleFullScreen}
              className="text-white px-4 py-2 rounded-lg font-semibold transition shadow-lg flex items-center justify-center hover:opacity-80"
              aria-label="View Full Screen"
            >
              <Maximize2 className="w-6 h-6" />
            </button>
          </div>
          <style>{`
            .embedded-projectile-wrapper {
              width: 100% !important;
              height: 100% !important;
              position: absolute;
              inset: 0;
              overflow: hidden;
              min-height: 475px;
            }
            .embedded-projectile-wrapper > div {
              width: 100% !important;
              height: 100% !important;
              position: absolute !important;
              inset: 0 !important;
            }
            .embedded-projectile-wrapper .h-screen {
              height: 100% !important;
              min-height: 100% !important;
            }
            .embedded-projectile-wrapper div[ref] {
              width: 100% !important;
              height: 100% !important;
              min-height: 475px !important;
            }
            .embedded-projectile-wrapper canvas {
              width: 100% !important;
              height: 100% !important;
              display: block !important;
            }
            
            /* For screens 576px and below: ensure wrapper respects fixed height */
            @media (max-width: 576px) {
              .embedded-projectile-wrapper {
                height: 475px !important;
                min-height: 475px !important;
                max-height: 475px !important;
              }
              .embedded-projectile-wrapper > div {
                height: 475px !important;
                min-height: 475px !important;
                max-height: 475px !important;
              }
              .embedded-projectile-wrapper .h-screen {
                height: 475px !important;
                min-height: 475px !important;
                max-height: 475px !important;
              }
              .embedded-projectile-wrapper div[ref] {
                height: 475px !important;
                min-height: 475px !important;
                max-height: 475px !important;
              }
              .embedded-projectile-wrapper canvas {
                height: 475px !important;
                min-height: 475px !important;
                max-height: 475px !important;
              }
            }
          `}</style>
          <div className="embedded-projectile-wrapper" style={{ width: '100%', height: '100%', minHeight: '475px' }}>
            {/* Single persistent instance - stable key prevents unmounting when prop changes */}
            <ProjectileMotionSimulator 
              isEmbedded={true} 
              onChartOpenChange={handleChartOpenChange} 
            />
          </div>
        </div>
      )}
    </>
  );
};

export default ProjectileMotionSimulatorWrapper;

