
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import HomePage from './components/HomePage';
import SimulationsListPage from './components/SimulationsListPage';
import SimulationsView from './components/SimulationsView';
import CommunityFeed from './components/CommunityFeed';
import Chatbot from './components/Chatbot';

export type View = 'home' | 'simulationsList' | 'simulations' | 'community' | 'profile' | 'settings';

const App: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);
  const [activeView, setActiveView] = useState<View>('home');
  const [activeSimulationId, setActiveSimulationId] = useState<string | null>(null);
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set(['physics']));

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

  const handleSelectSimulation = (simulationId: string) => {
    setActiveSimulationId(simulationId);
    setActiveView('simulations');
  };

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

  const handleNavigate = (view: View) => {
    setActiveView(view);
    if (view === 'simulationsList') {
      setActiveSimulationId(null);
    }
  };

  const renderContent = () => {
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
      <div className="flex-1 flex flex-col overflow-hidden transition-all duration-300" style={{ marginLeft: isSidebarOpen && window.innerWidth >= 1024 ? '280px' : '0' }}>
        <Header onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-brand-light p-0">
          {renderContent()}
        </main>
      </div>
      <Chatbot />
    </div>
  );
};

export default App;
