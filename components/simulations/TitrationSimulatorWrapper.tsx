import React, { useState } from 'react';
import TitrationSimulator from './TitrationSimulator';
import { Maximize2, Minimize2, Play, Pause, RotateCcw } from 'lucide-react';

interface TitrationSimulatorWrapperProps {
  // Props can be added here if needed in the future
}

const TitrationSimulatorWrapper: React.FC<TitrationSimulatorWrapperProps> = () => {
  const [isFullScreen, setIsFullScreen] = useState(false);

  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };

  // Full display mode - original implementation
  if (isFullScreen) {
    return (
      <>
        <div className="fixed inset-0 z-50 bg-black overflow-hidden">
          {/* Top Right Buttons Container - Exit Full Screen and Show Guide */}
          <div className="absolute top-4 right-4 z-[100] flex flex-row gap-2 items-center">
            {/* Show Guide button will be rendered by TitrationSimulator */}
            <div id="fullscreen-guide-button-container"></div>
            <button
              onClick={toggleFullScreen}
              className="text-white px-4 py-2 rounded-lg font-semibold transition shadow-lg flex items-center justify-center hover:opacity-80"
              aria-label="Exit Full Screen"
            >
              <Minimize2 className="w-6 h-6" />
            </button>
          </div>
          <div className="w-full h-full" style={{ width: '100vw', height: '100vh' }}>
            <TitrationSimulator isEmbedded={false} />
          </div>
        </div>
      </>
    );
  }

  // Embedded mode - rendered inside SimulationsView's container
  return (
    <>
      {/* Top Right Buttons Container - Full Screen and Show Guide */}
      <div className="absolute top-4 right-4 z-10 flex flex-row gap-2 items-center">
        {/* This will contain the Show Guide button from TitrationSimulator */}
        <div id="embedded-guide-button-container"></div>
        <button
          onClick={toggleFullScreen}
          className="text-white px-4 py-2 rounded-lg font-semibold transition shadow-lg flex items-center justify-center hover:opacity-80"
          aria-label="View Full Screen"
        >
          <Maximize2 className="w-6 h-6" />
        </button>
      </div>
      {/* Start/Stop Button - Overlay on Canvas */}
      <div className="absolute bottom-4 left-0 right-0 z-10 flex justify-center pointer-events-none">
        <div className="flex gap-2 pointer-events-auto" id="embedded-controls-container">
          {/* Buttons will be controlled by TitrationSimulator component */}
        </div>
      </div>
      <style>{`
        .embedded-titration-wrapper {
          width: 100% !important;
          height: 100% !important;
          position: absolute;
          inset: 0;
          overflow: hidden;
          min-height: 500px;
        }
        .embedded-titration-wrapper > div {
          width: 100% !important;
          height: 100% !important;
          position: absolute !important;
          inset: 0 !important;
        }
        .embedded-titration-wrapper .h-screen {
          height: 100% !important;
          min-height: 100% !important;
        }
        .embedded-titration-wrapper div[ref] {
          width: 100% !important;
          height: 100% !important;
          min-height: 500px !important;
        }
        .embedded-titration-wrapper canvas {
          width: 100% !important;
          height: 100% !important;
          display: block !important;
        }
        /* Force mobile UI in embedded mode */
        .embedded-titration-wrapper .force-mobile-ui {
          display: block !important;
        }
        .embedded-titration-wrapper .hide-in-embedded {
          display: none !important;
        }
      `}</style>
      <div className="embedded-titration-wrapper" style={{ width: '100%', height: '100%', minHeight: '500px' }}>
        <TitrationSimulator isEmbedded={true} />
      </div>
    </>
  );
};

export default TitrationSimulatorWrapper;

