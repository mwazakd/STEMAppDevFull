import React, { useState } from 'react';
import TitrationSimulator from './TitrationSimulator';
import { Maximize2, Minimize2 } from 'lucide-react';

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
          <button
            onClick={toggleFullScreen}
            className="absolute top-4 right-4 z-[100] bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold transition shadow-lg flex items-center gap-2"
            aria-label="Exit Full Screen"
          >
            <Minimize2 className="w-5 h-5" />
            Exit Full Screen
          </button>
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
      <button
        onClick={toggleFullScreen}
        className="absolute top-4 right-4 z-10 bg-brand-primary hover:bg-brand-primary-dark text-white px-4 py-2 rounded-lg font-semibold transition shadow-lg flex items-center gap-2"
        aria-label="View Full Screen"
      >
        <Maximize2 className="w-5 h-5" />
        Full Screen
      </button>
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
        .embedded-titration-wrapper .mobile-start-button {
          position: fixed !important;
          bottom: 0 !important;
          left: 0 !important;
          right: 0 !important;
          z-index: 100 !important;
        }
      `}</style>
      <div className="embedded-titration-wrapper" style={{ width: '100%', height: '100%', minHeight: '500px' }}>
        <TitrationSimulator isEmbedded={true} />
      </div>
    </>
  );
};

export default TitrationSimulatorWrapper;

