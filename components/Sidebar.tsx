
import React from 'react';
import type { View } from '../App';
import { MOCK_SUBJECTS } from '../constants';
import { BeakerIcon, CommunityIcon, ChevronDownIcon, PlayIcon } from './Icons';
import { ArrowLeft, Home } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  activeView: View;
  setActiveView: (view: View) => void;
  activeSimulationId: string | null;
  onSelectSimulation: (simulationId: string) => void;
  expandedSubjects: Set<string>;
  onToggleSubject: (subjectId: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  isOpen, 
  activeView, 
  setActiveView,
  activeSimulationId,
  onSelectSimulation,
  expandedSubjects,
  onToggleSubject,
}) => {
  const baseItemClass = 'flex w-full items-center px-4 py-3 text-lg font-medium rounded-lg transition-colors duration-200';
  const activeItemClass = 'bg-brand-primary/10 text-brand-primary';
  const inactiveItemClass = 'text-gray-600 hover:bg-gray-200/50 hover:text-brand-dark';

  // Sidebar starts below header (64px = h-16) on both mobile and desktop
  const topPosition = 'top-16';
  const sidebarHeight = 'h-[calc(100vh-4rem)]';
  
  return (
    <aside className={`fixed ${topPosition} left-0 ${sidebarHeight} bg-white border-r border-gray-200 transition-transform duration-300 z-[200] ${isOpen ? 'w-[280px]' : '-translate-x-full'} ${!isOpen ? 'w-[280px]' : ''}`}>
      <div className="h-full flex flex-col p-4">
        {/* Navigation buttons row */}
        <div className="flex items-center justify-evenly flex-shrink-0 px-4" style={{ height: '51.2px' }}>
          <button 
            onClick={() => {
              if (activeView === 'simulations' && activeSimulationId) {
                setActiveView('simulationsList');
              }
            }}
            className="flex-1 flex items-center justify-center p-2 rounded-lg text-gray-600 hover:bg-gray-200/50 hover:text-brand-dark focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-primary transition-colors"
            title="Back to simulations"
            disabled={!(activeView === 'simulations' && activeSimulationId)}
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <button 
            onClick={() => setActiveView('home')}
            className={`flex-1 flex items-center justify-center p-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-primary ${activeView === 'home' ? 'bg-brand-primary/10 text-brand-primary' : 'text-gray-600 hover:bg-gray-200/50 hover:text-brand-dark'}`}
            title="Home"
          >
            <Home className="h-6 w-6" />
          </button>
          <button 
            onClick={() => setActiveView('community')}
            className={`flex-1 flex items-center justify-center p-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-primary ${activeView === 'community' ? 'bg-brand-primary/10 text-brand-primary' : 'text-gray-600 hover:bg-gray-200/50 hover:text-brand-dark'}`}
            title="Community"
          >
            <CommunityIcon className="h-6 w-6" />
          </button>
        </div>
        <nav className="flex-1 mt-2 space-y-2 overflow-y-auto">
           {activeView === 'simulations' && (
             <div className="pt-2">
                <h3 className="px-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">Subjects</h3>
                <div className="mt-3 space-y-1">
                    {MOCK_SUBJECTS.map((subject) => (
                      <div key={subject.id}>
                        <button onClick={() => onToggleSubject(subject.id)} className="w-full flex items-center justify-between px-4 py-2 text-md font-medium text-gray-700 rounded-lg hover:bg-gray-200/50">
                          <div className="flex items-center">
                            <subject.icon className="h-6 w-6 mr-3 text-brand-accent"/>
                            {subject.name}
                          </div>
                          <ChevronDownIcon className={`h-5 w-5 transition-transform ${expandedSubjects.has(subject.id) ? 'rotate-180' : ''}`} />
                        </button>
                        {expandedSubjects.has(subject.id) && (
                          <div className="pl-4 mt-1 space-y-1">
                            {subject.modules.map(module => (
                              <div key={module.id} className="pl-4 border-l-2 border-gray-200">
                                <h4 className="py-2 text-sm font-semibold text-gray-600">{module.title}</h4>
                                <div className="space-y-1">
                                  {module.lessons.map(lesson => {
                                    const isSimulation = lesson.content.type === 'simulation';
                                    const isActive = lesson.id === activeSimulationId;
                                    return (
                                      <div key={lesson.id} className={`flex items-center justify-between pl-4 pr-2 py-2 rounded-md ${isActive ? 'bg-brand-accent/10' : ''}`}>
                                        <span className={`text-sm ${isActive ? 'font-bold text-brand-accent' : 'text-gray-700'}`}>{lesson.title}</span>
                                        {isSimulation && (
                                          <button onClick={() => onSelectSimulation(lesson.id)} className={`p-1 rounded-md ${isActive ? 'bg-brand-accent text-white' : 'bg-gray-200 text-gray-600 hover:bg-brand-accent/80 hover:text-white'}`}>
                                            <PlayIcon className="h-4 w-4" />
                                          </button>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
             </div>
           )}
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;
