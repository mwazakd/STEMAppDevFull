
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
const getStateFromURL = (): { view: View; simulationId: string | null; subject: string | null } => {
  const params = new URLSearchParams(window.location.search);
  const view = (params.get('view') as View) || 'home';
  const simulationId = params.get('simulationId');
  const subject = params.get('subject');
  
  // Validate view
  const validViews: View[] = ['home', 'simulationsList', 'simulations', 'community', 'profile', 'settings'];
  const validView = validViews.includes(view) ? view : 'home';
  
  return { view: validView, simulationId, subject };
};

const updateURL = (view: View, simulationId: string | null, subject: string | null = null) => {
  const params = new URLSearchParams();
  if (view !== 'home') {
    params.set('view', view);
  }
  if (simulationId) {
    params.set('simulationId', simulationId);
  }
  if (subject) {
    params.set('subject', subject);
  }
  
  const newURL = params.toString() 
    ? `${window.location.pathname}?${params.toString()}`
    : window.location.pathname;
  
  window.history.pushState({ view, simulationId, subject }, '', newURL);
};

const App: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);
  const [activeView, setActiveView] = useState<View>('home');
  const [activeSimulationId, setActiveSimulationId] = useState<string | null>(null);
  const [activeSubject, setActiveSubject] = useState<string | null>(null);
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set(['physics']));
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize state from URL on mount
  useEffect(() => {
    const { view, simulationId, subject } = getStateFromURL();
    setActiveView(view);
    setActiveSimulationId(simulationId);
    setActiveSubject(subject);
    
    // Close sidebar if on simulationsList page
    if (view === 'simulationsList') {
      setIsSidebarOpen(false);
    } else {
      // Otherwise, use default behavior (open on desktop, closed on mobile)
      setIsSidebarOpen(window.innerWidth >= 1024);
    }
    
    // Set initial history state
    if (view !== 'home' || simulationId || subject) {
      window.history.replaceState({ view, simulationId, subject }, '', window.location.href);
    }
    
    setIsInitialized(true);
  }, []);

  // Handle browser back/forward buttons
  useEffect(() => {
    if (!isInitialized) return;
    
    const handlePopState = (event: PopStateEvent) => {
      let newView: View;
      if (event.state) {
        newView = event.state.view || 'home';
        setActiveView(newView);
        setActiveSimulationId(event.state.simulationId || null);
        setActiveSubject(event.state.subject || null);
      } else {
        const { view, simulationId, subject } = getStateFromURL();
        newView = view;
        setActiveView(view);
        setActiveSimulationId(simulationId);
        setActiveSubject(subject);
      }
      
      // Close sidebar if navigating to simulationsList
      if (newView === 'simulationsList') {
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isInitialized]);

  // Handle window resize for responsive sidebar
  useEffect(() => {
    const handleResize = () => {
      // Keep sidebar closed on simulationsList page regardless of screen size
      if (activeView === 'simulationsList') {
        setIsSidebarOpen(false);
      } else if (window.innerWidth >= 1024) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeView]);

  // Update URL when state changes (after initialization)
  useEffect(() => {
    if (!isInitialized) return;
    updateURL(activeView, activeSimulationId, activeSubject);
  }, [activeView, activeSimulationId, activeSubject, isInitialized]);

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

  const handleNavigate = useCallback((view: View, subject?: string | null) => {
    setActiveView(view);
    if (view === 'simulationsList') {
      setActiveSimulationId(null);
      setActiveSubject(subject || null);
      setIsSidebarOpen(false); // Close sidebar when navigating to simulations list
    } else {
      setActiveSubject(null);
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
        return <SimulationsListPage 
          onSelectSimulation={handleSelectSimulation} 
          onNavigate={handleNavigate}
          subject={activeSubject}
        />;
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
          className="fixed top-16 left-0 right-0 bottom-0 bg-black/50 z-[150]"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      {/* On desktop, sidebar slides content to the side but doesn't overlay */}
      {/* On mobile, sidebar overlays content with backdrop */}
      <Header 
        onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} 
        isSidebarOpen={isSidebarOpen}
        onNavigateHome={() => handleNavigate('home')}
      />
      <div 
        className="flex-1 flex flex-col overflow-hidden transition-all duration-300" 
        style={{ 
          marginLeft: isSidebarOpen && window.innerWidth >= 1024 ? '280px' : '0',
          marginTop: '4rem', // Account for fixed header (64px = 4rem)
          // Use GPU acceleration for smoother transitions without layout reflow
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden'
        }}
      >
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
