
import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import HomePage from './components/HomePage';
import SimulationsListPage from './components/SimulationsListPage';
import SimulationsView from './components/SimulationsView';
import CommunityFeed from './components/CommunityFeed';
import Chatbot from './components/Chatbot';

export type View = 'home' | 'simulationsList' | 'simulations' | 'community' | 'profile' | 'settings';

// Helper functions for URL state management
const getStateFromURL = (): { view: View; simulationId: string | null } => {
  const params = new URLSearchParams(window.location.search);
  const view = (params.get('view') as View) || 'home';
  const simulationId = params.get('simulationId');
  
  // Validate view
  const validViews: View[] = ['home', 'simulationsList', 'simulations', 'community', 'profile', 'settings'];
  const validView = validViews.includes(view) ? view : 'home';
  
  return { view: validView, simulationId };
};

const updateURL = (view: View, simulationId: string | null) => {
  const params = new URLSearchParams();
  if (view !== 'home') {
    params.set('view', view);
  }
  if (simulationId) {
    params.set('simulationId', simulationId);
  }
  
  const newURL = params.toString() 
    ? `${window.location.pathname}?${params.toString()}`
    : window.location.pathname;
  
  window.history.pushState({ view, simulationId }, '', newURL);
};

const App: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);
  const [activeView, setActiveView] = useState<View>('home');
  const [activeSimulationId, setActiveSimulationId] = useState<string | null>(null);
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set(['physics']));
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize state from URL on mount
  useEffect(() => {
    const { view, simulationId } = getStateFromURL();
    setActiveView(view);
    setActiveSimulationId(simulationId);
    
    // Set initial history state
    if (view !== 'home' || simulationId) {
      window.history.replaceState({ view, simulationId }, '', window.location.href);
    }
    
    setIsInitialized(true);
  }, []);

  // Handle browser back/forward buttons
  useEffect(() => {
    if (!isInitialized) return;
    
    const handlePopState = (event: PopStateEvent) => {
      if (event.state) {
        setActiveView(event.state.view || 'home');
        setActiveSimulationId(event.state.simulationId || null);
      } else {
        const { view, simulationId } = getStateFromURL();
        setActiveView(view);
        setActiveSimulationId(simulationId);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isInitialized]);

  // Handle window resize for responsive sidebar
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update URL when state changes (after initialization)
  useEffect(() => {
    if (!isInitialized) return;
    updateURL(activeView, activeSimulationId);
  }, [activeView, activeSimulationId, isInitialized]);

  const handleSelectSimulation = useCallback((simulationId: string) => {
    setActiveSimulationId(simulationId);
    setActiveView('simulations');
  }, []);

  const handleToggleSubject = (subjectId: string) => {
    setExpandedSubjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(subjectId)) {
        newSet.delete(subjectId);
      } else {
        newSet.add(subjectId);
      }
      return newSet;
    });
  };

  const handleNavigate = useCallback((view: View) => {
    setActiveView(view);
    if (view === 'simulationsList') {
      setActiveSimulationId(null);
    }
  }, []);

  const renderContent = () => {
    // Don't render until initialized to prevent flashing
    if (!isInitialized) {
      return null;
    }
    
    switch (activeView) {
      case 'home':
        return <HomePage onNavigate={handleNavigate} />;
      case 'simulationsList':
        return <SimulationsListPage onSelectSimulation={handleSelectSimulation} onNavigate={handleNavigate} />;
      case 'simulations':
        return <SimulationsView activeSimulationId={activeSimulationId} onSelectSimulation={handleSelectSimulation} />;
      case 'community':
        return <CommunityFeed />;
      default:
        return <HomePage onNavigate={handleNavigate} />;
    }
  };

  // For home page, don't show sidebar or header (it has its own)
  if (!isInitialized) {
    return null; // Prevent rendering until state is initialized from URL
  }
  
  if (activeView === 'home') {
    return (
      <>
        {renderContent()}
        <Chatbot />
      </>
    );
  }

  // For other pages, show sidebar and header
  return (
    <div className="flex h-screen bg-brand-light font-sans text-brand-dark">
      <Sidebar 
        isOpen={isSidebarOpen} 
        activeView={activeView} 
        setActiveView={handleNavigate}
        activeSimulationId={activeSimulationId}
        onSelectSimulation={handleSelectSimulation}
        expandedSubjects={expandedSubjects}
        onToggleSubject={handleToggleSubject}
      />
      {isSidebarOpen && window.innerWidth < 1024 && (
        <div 
          className="fixed inset-0 bg-black/50 z-[150]"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      <div 
        className="flex-1 flex flex-col overflow-hidden transition-all duration-300" 
        style={{ 
          marginLeft: isSidebarOpen && window.innerWidth >= 1024 ? '280px' : '0',
          // Use GPU acceleration for smoother transitions without layout reflow
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden'
        }}
      >
        <Header onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />
        <main 
          className="flex-1 overflow-x-hidden overflow-y-auto bg-brand-light p-0"
          style={{
            // Ensure main content maintains size during sidebar transition
            width: '100%',
            minHeight: '100%'
          }}
        >
          {renderContent()}
        </main>
      </div>
      <Chatbot />
    </div>
  );
};

export default App;
