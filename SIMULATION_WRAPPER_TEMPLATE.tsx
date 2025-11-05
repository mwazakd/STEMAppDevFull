/**
 * SIMULATION WRAPPER TEMPLATE
 * 
 * This is a template file for creating wrapper components for simulations.
 * Copy this file and customize it for your simulation.
 * 
 * Instructions:
 * 1. Copy this file to components/simulations/YourSimulatorWrapper.tsx
 * 2. Replace all instances of "YourSimulator" with your simulation name
 * 3. Replace "embedded-your-wrapper" with your unique class name
 * 4. Follow SIMULATION_INTEGRATION_GUIDE.md for full instructions
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import YourSimulator from './YourSimulator';
import { Maximize2, Minimize2 } from 'lucide-react';

interface YourSimulatorWrapperProps {
  // Props can be added here if needed in the future
}

const YourSimulatorWrapper: React.FC<YourSimulatorWrapperProps> = () => {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isChartOpen, setIsChartOpen] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
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
  
  const handleTutorialOpenChange = (isOpen: boolean) => {
    setIsTutorialOpen(isOpen);
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

    window.addEventListener('keydown', handleEscKey, true);
    return () => {
      window.removeEventListener('keydown', handleEscKey, true);
    };
  }, [isFullScreen]);

  return (
    <>
      {/* Fullscreen Container - Rendered via Portal to document.body */}
      {isFullScreen && createPortal(
        <div 
          className="fixed z-[300] bg-black overflow-hidden"
          style={{ 
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            paddingTop: 'env(safe-area-inset-top, 0px)',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            paddingLeft: 'env(safe-area-inset-left, 0px)',
            paddingRight: 'env(safe-area-inset-right, 0px)'
          }}
        >
          {/* Top Right Buttons Container - Exit Full Screen - Hide when chart or tutorial is open */}
          <div 
            className={`absolute z-[100] flex flex-row gap-2 items-center transition-opacity`}
            style={{ 
              top: `max(1rem, calc(env(safe-area-inset-top, 0px) + 1rem))`,
              right: `max(1rem, calc(env(safe-area-inset-right, 0px) + 1rem))`,
              display: (isMobile && isChartOpen) || isTutorialOpen ? 'none' : 'flex' 
            }}
          >
            <button
              onClick={toggleFullScreen}
              className="text-white px-4 py-2 rounded-lg font-semibold transition shadow-lg flex items-center justify-center hover:opacity-80"
              aria-label="Exit Full Screen"
            >
              <Minimize2 className="w-6 h-6" />
            </button>
          </div>
          <div className="w-full h-full" style={{ width: '100%', height: '100%' }}>
            <YourSimulator 
              key="persistent-your-simulator"
              isEmbedded={false} 
              onChartOpenChange={handleChartOpenChange}
              onTutorialOpenChange={handleTutorialOpenChange}
            />
          </div>
        </div>,
        document.body
      )}

      {/* Embedded Container */}
      {!isFullScreen && (
        <div>
          {/* Top Right Buttons Container - Full Screen - Hide when chart or tutorial is open */}
          <div 
            className={`absolute top-4 right-4 z-10 flex flex-row gap-2 items-center ${(isMobile && isChartOpen) || isTutorialOpen ? 'hidden' : ''} transition-opacity`}
            style={{ display: (isMobile && isChartOpen) || isTutorialOpen ? 'none' : 'flex' }}
          >
            <button
              onClick={toggleFullScreen}
              className="text-white px-4 py-2 rounded-lg font-semibold transition shadow-lg flex items-center justify-center hover:opacity-80"
              aria-label="View Full Screen"
            >
              <Maximize2 className="w-6 h-6" />
            </button>
          </div>
          
          {/* Embedded Controls Container */}
          <div className="absolute bottom-4 left-0 right-0 z-10 flex justify-center pointer-events-none">
            <div className="flex gap-2 pointer-events-auto" id="embedded-controls-container">
              {/* Buttons will be controlled by YourSimulator component */}
            </div>
          </div>
          
          <style>{`
            .embedded-your-wrapper {
              width: 100% !important;
              height: 100% !important;
              position: absolute;
              inset: 0;
              overflow: hidden;
              min-height: 475px;
            }
            .embedded-your-wrapper > div {
              width: 100% !important;
              height: 100% !important;
              position: absolute !important;
              inset: 0 !important;
            }
            .embedded-your-wrapper .h-screen {
              height: 100% !important;
              min-height: 100% !important;
            }
            .embedded-your-wrapper div[ref] {
              width: 100% !important;
              height: 100% !important;
              min-height: 475px !important;
            }
            .embedded-your-wrapper canvas {
              width: 100% !important;
              height: 100% !important;
              display: block !important;
            }
            
            @media (max-width: 576px) {
              .embedded-your-wrapper {
                height: 475px !important;
                min-height: 475px !important;
                max-height: 475px !important;
              }
              .embedded-your-wrapper > div {
                height: 475px !important;
                min-height: 475px !important;
                max-height: 475px !important;
              }
              .embedded-your-wrapper .h-screen {
                height: 475px !important;
                min-height: 475px !important;
                max-height: 475px !important;
              }
              .embedded-your-wrapper div[ref] {
                height: 475px !important;
                min-height: 475px !important;
                max-height: 475px !important;
              }
              .embedded-your-wrapper canvas {
                height: 475px !important;
                min-height: 475px !important;
                max-height: 475px !important;
              }
            }
          `}</style>
          
          <div className="embedded-your-wrapper" style={{ width: '100%', height: '100%', minHeight: '475px' }}>
            <YourSimulator 
              key="persistent-your-simulator"
              isEmbedded={true} 
              onChartOpenChange={handleChartOpenChange} 
            />
          </div>
        </div>
      )}
    </>
  );
};

export default YourSimulatorWrapper;

