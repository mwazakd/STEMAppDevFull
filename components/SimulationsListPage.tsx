import React, { useMemo } from 'react';
import type { Lesson } from '../types';
import { MOCK_SUBJECTS } from '../constants';
import Footer from './Footer';

interface SimulationsListPageProps {
  onSelectSimulation: (simulationId: string) => void;
  onNavigate?: (view: 'home' | 'simulationsList', subject?: string | null) => void;
  subject?: string | null;
}

// Get all simulations grouped by subject
const getAllSimulationsBySubject = () => {
  return MOCK_SUBJECTS.map(subject => ({
    ...subject,
    simulations: subject.modules.flatMap(module =>
      module.lessons
        .filter(lesson => lesson.content.type === 'simulation')
        .map(lesson => ({ ...lesson, subjectName: subject.name, subjectId: subject.id }))
    )
  }));
};

const SimulationsListPage: React.FC<SimulationsListPageProps> = ({ 
  onSelectSimulation, 
  onNavigate,
  subject 
}) => {
  const [viewMode, setViewMode] = React.useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [difficultyFilter, setDifficultyFilter] = React.useState('All Levels');
  const [topicFilter, setTopicFilter] = React.useState('All Topics');
  const [durationFilter, setDurationFilter] = React.useState('Any Duration');

  const subjectsWithSimulations = useMemo(() => getAllSimulationsBySubject(), []);

  // If subject is specified, show subject-specific page
  if (subject) {
    const selectedSubject = MOCK_SUBJECTS.find(s => s.id === subject);
    const subjectSimulations = subjectsWithSimulations.find(s => s.id === subject)?.simulations || [];

    // Filter simulations
    const filteredSimulations = subjectSimulations.filter(sim => {
      const matchesSearch = sim.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           sim.content.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDifficulty = difficultyFilter === 'All Levels' || 
                               sim.content.level?.some(level => 
                                 difficultyFilter === 'Beginner' ? level.includes('Grade') :
                                 difficultyFilter === 'Intermediate' ? level.includes('A-Level') :
                                 difficultyFilter === 'Advanced' ? level.includes('Advanced') : true
                               );
      return matchesSearch && matchesDifficulty;
    });

    const subjectGradient = {
      'physics': 'from-[#f093fb] to-[#f5576c]',
      'chemistry': 'from-[#0056d2] to-[#00c6ff]',
      'biology': 'from-[#4facfe] to-[#00f2fe]',
      'math': 'from-[#43e97b] to-[#38f9d7]'
    }[subject] || 'from-[#667eea] to-[#764ba2]';

    const subjectName = selectedSubject?.name || 'Subject';

  return (
      <div className="bg-[#f5f5f5] min-h-screen">
        {/* Hero Section - Subject Specific */}
        <section className={`hero bg-gradient-to-br ${subjectGradient} text-white py-16 px-6`}>
        <div className="hero-content max-w-7xl mx-auto">
            <div className="breadcrumb flex gap-2 mb-4 text-sm opacity-90">
              <button 
                onClick={() => onNavigate?.('home')} 
                className="hover:underline text-white bg-transparent border-none cursor-pointer p-0"
              >
                Home
              </button>
              <span>›</span>
              <button 
                onClick={() => onNavigate?.('simulationsList')} 
                className="hover:underline text-white bg-transparent border-none cursor-pointer p-0"
              >
                Simulations
              </button>
              <span>›</span>
              <span>{subjectName}</span>
          </div>
            <h1 className="text-5xl font-bold mb-4">{subjectName} Simulations</h1>
          <p className="text-lg opacity-95 max-w-2xl">
              Explore interactive {subjectName.toLowerCase()} experiments and simulations. Learn by doing with our comprehensive collection of virtual labs.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <main className="container max-w-7xl mx-auto py-10 px-6">
        {/* Filters */}
        <div className="filters bg-white p-6 rounded-lg mb-8 shadow-sm">
            <div className="filter-row flex gap-4 flex-wrap items-end">
            <FilterGroup label="Difficulty">
                <select 
                  value={difficultyFilter}
                  onChange={(e) => setDifficultyFilter(e.target.value)}
                  className="filter-input w-full min-w-[180px] px-3.5 py-2.5 border border-[#d0d0d0] rounded text-sm focus:outline-none focus:border-[#0056d2] cursor-pointer bg-white"
                >
                <option>All Levels</option>
                <option>Beginner</option>
                <option>Intermediate</option>
                <option>Advanced</option>
              </select>
            </FilterGroup>
              <FilterGroup label="Topic">
                <select 
                  value={topicFilter}
                  onChange={(e) => setTopicFilter(e.target.value)}
                  className="filter-input w-full min-w-[180px] px-3.5 py-2.5 border border-[#d0d0d0] rounded text-sm focus:outline-none focus:border-[#0056d2] cursor-pointer bg-white"
                >
                  <option>All Topics</option>
                  <option>Acid-Base</option>
                  <option>Thermodynamics</option>
                  <option>Organic Chemistry</option>
                  <option>Electrochemistry</option>
              </select>
            </FilterGroup>
            <FilterGroup label="Duration">
                <select 
                  value={durationFilter}
                  onChange={(e) => setDurationFilter(e.target.value)}
                  className="filter-input w-full min-w-[180px] px-3.5 py-2.5 border border-[#d0d0d0] rounded text-sm focus:outline-none focus:border-[#0056d2] cursor-pointer bg-white"
                >
                <option>Any Duration</option>
                <option>&lt; 15 minutes</option>
                <option>15-30 minutes</option>
                <option>&gt; 30 minutes</option>
              </select>
            </FilterGroup>
            <FilterGroup label="Search">
                <input 
                  type="text" 
                  placeholder="Search simulations..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="filter-input w-full min-w-[180px] px-3.5 py-2.5 border border-[#d0d0d0] rounded text-sm focus:outline-none focus:border-[#0056d2] bg-white"
                />
            </FilterGroup>
          </div>
        </div>
        
          {/* Results Header */}
          <div className="results-header flex justify-between items-center mb-6">
            <div className="results-count text-sm text-gray-600">
              Showing {filteredSimulations.length} simulations
            </div>
            <div className="view-toggle flex gap-2">
              <button 
                onClick={() => setViewMode('grid')}
                className={`px-3 py-2 border rounded text-sm font-medium transition-all ${
                  viewMode === 'grid'
                    ? 'bg-[#0056d2] text-white border-[#0056d2]'
                    : 'bg-white border-[#d0d0d0] text-[#1f1f1f] hover:border-[#0056d2] hover:text-[#0056d2]'
                }`}
              >
                ⊞ Grid
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 border rounded text-sm font-medium transition-all ${
                  viewMode === 'list'
                    ? 'bg-[#0056d2] text-white border-[#0056d2]'
                    : 'bg-white border-[#d0d0d0] text-[#1f1f1f] hover:border-[#0056d2] hover:text-[#0056d2]'
                }`}
              >
                ☰ List
              </button>
            </div>
          </div>

          {/* Simulations Grid */}
          <div className={`simulations-grid grid gap-6 mb-12 ${
            viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'
          }`}>
            {filteredSimulations.length > 0 ? (
              filteredSimulations.map(sim => (
                <SimCard 
                  key={sim.id} 
                  simulation={sim} 
                  onClick={() => onSelectSimulation(sim.id)} 
                  viewMode={viewMode}
                />
              ))
            ) : (
              <div className="col-span-full text-center py-12 text-gray-500">
                No simulations found. Try adjusting your filters.
              </div>
            )}
        </div>

        {/* Pagination */}
          {filteredSimulations.length > 0 && (
        <div className="pagination flex justify-center gap-2">
              <button className="page-btn px-4 py-2 border border-[#d0d0d0] rounded bg-white text-sm font-medium hover:border-[#0056d2] hover:text-[#0056d2] transition-all cursor-pointer">
                « Previous
              </button>
              <button className="page-btn px-4 py-2 border border-[#0056d2] rounded bg-[#0056d2] text-white text-sm font-medium cursor-pointer">
                1
              </button>
              <button className="page-btn px-4 py-2 border border-[#d0d0d0] rounded bg-white text-sm font-medium hover:border-[#0056d2] hover:text-[#0056d2] transition-all cursor-pointer">
                Next »
              </button>
            </div>
          )}
        </main>
        <Footer />
      </div>
    );
  }

  // Main page - show all subjects with previews
  return (
    <div className="bg-[#f5f5f5] min-h-screen">
      {/* Hero Section - All Subjects */}
      <section className="hero bg-gradient-to-br from-[#667eea] to-[#764ba2] text-white py-16 px-6">
        <div className="hero-content max-w-7xl mx-auto">
          <div className="breadcrumb flex gap-2 mb-4 text-sm opacity-90">
            <button 
              onClick={() => onNavigate?.('home')} 
              className="hover:underline text-white bg-transparent border-none cursor-pointer p-0"
            >
              Home
            </button>
            <span>›</span>
            <span>Simulations</span>
          </div>
          <h1 className="text-5xl font-bold mb-4">Explore Interactive Simulations</h1>
          <p className="text-lg opacity-95 max-w-2xl">
            Learn by doing with our comprehensive collection of virtual labs across all STEM subjects.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <main className="container max-w-7xl mx-auto py-10 px-6">
        {subjectsWithSimulations.map((subjectData) => {
          const previewSimulations = subjectData.simulations.slice(0, 4);
          const totalCount = subjectData.simulations.length;
          
          if (totalCount === 0) return null; // Skip subjects with no simulations

          const subjectGradient = {
            'physics': 'from-[#f093fb] to-[#f5576c]',
            'chemistry': 'from-[#0056d2] to-[#00c6ff]',
            'biology': 'from-[#4facfe] to-[#00f2fe]',
            'math': 'from-[#43e97b] to-[#38f9d7]'
          }[subjectData.id] || 'from-[#667eea] to-[#764ba2]';

          const SubjectIcon = subjectData.icon;

          return (
            <SubjectPreviewSection
              key={subjectData.id}
              subjectName={subjectData.name}
              subjectId={subjectData.id}
              simulations={previewSimulations}
              totalCount={totalCount}
              gradient={subjectGradient}
              icon={SubjectIcon}
              onSelectSimulation={onSelectSimulation}
              onSeeMore={() => onNavigate?.('simulationsList', subjectData.id)}
            />
          );
        })}
      </main>
      <Footer />
    </div>
  );
};

// Subject Preview Section Component
const SubjectPreviewSection: React.FC<{
  subjectName: string;
  subjectId: string;
  simulations: any[];
  totalCount: number;
  gradient: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  onSelectSimulation: (id: string) => void;
  onSeeMore: () => void;
}> = ({ 
  subjectName, 
  subjectId, 
  simulations, 
  totalCount, 
  gradient, 
  icon: Icon,
  onSelectSimulation,
  onSeeMore 
}) => {
  return (
    <section className="mb-12">
      {/* Subject Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{subjectName}</h2>
            <p className="text-sm text-gray-600">{totalCount} simulation{totalCount !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button
          onClick={onSeeMore}
          className="px-6 py-2 bg-[#0056d2] text-white rounded-lg font-medium hover:bg-[#0043a8] transition-colors flex items-center gap-2"
        >
          See More
          <span>→</span>
        </button>
      </div>

      {/* Preview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {simulations.map(sim => (
          <SimCard
            key={sim.id}
            simulation={sim}
            onClick={() => onSelectSimulation(sim.id)}
            viewMode="grid"
          />
        ))}
      </div>
    </section>
  );
};

const FilterGroup: React.FC<{label: string, children: React.ReactNode}> = ({ label, children }) => (
    <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">{label}</label>
        {children}
    </div>
);

const SimCard: React.FC<{
  simulation: any;
  onClick: () => void;
  viewMode: 'grid' | 'list';
}> = ({ simulation, onClick, viewMode }) => {
    const { content } = simulation;
  const difficulty = content?.level?.includes('A-Level') || content?.level?.includes('Intermediate') 
    ? 'Intermediate' 
    : content?.level?.includes('Advanced') 
    ? 'Advanced' 
    : 'Beginner';
  
    const difficultyClass = {
    'Beginner': 'text-[#059669]',
    'Intermediate': 'text-[#d97706]',
    'Advanced': 'text-[#dc2626]'
  }[difficulty] || 'text-[#059669]';

    const subjectGradient = {
    'physics': 'from-[#f093fb] to-[#f5576c]',
    'chemistry': 'from-[#0056d2] to-[#00c6ff]',
    'biology': 'from-[#4facfe] to-[#00f2fe]',
    'math': 'from-[#43e97b] to-[#38f9d7]'
  }[simulation.subjectId] || 'from-[#667eea] to-[#764ba2]';

  const categoryName = simulation.subjectName || 'General';

    return (
    <div 
      onClick={onClick} 
      className={`sim-card bg-white rounded-lg overflow-hidden shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl cursor-pointer ${
        viewMode === 'list' ? 'flex' : ''
      }`}
    >
      <div className={`sim-thumbnail ${viewMode === 'list' ? 'w-64 flex-shrink-0' : 'w-full'} h-44 bg-gradient-to-br ${subjectGradient} relative`}>
        <div className={`difficulty-badge absolute top-3 right-3 bg-white/95 px-3 py-1 rounded-full text-xs font-semibold ${difficultyClass}`}>
                    {difficulty}
                </div>
            </div>
      <div className="sim-content p-5 flex-1">
        <div className="sim-category text-xs font-bold text-[#0056d2] uppercase tracking-wide mb-2">
          {categoryName}
        </div>
        <h3 className="sim-title text-lg font-bold mb-2 text-[#1f1f1f] leading-snug">
          {simulation.title}
        </h3>
        <p className="sim-description text-sm text-gray-600 mb-4 leading-relaxed">
          {content?.description || 'Interactive simulation for learning and experimentation.'}
        </p>
        <div className="sim-meta flex gap-4 text-sm text-gray-600 pt-4 border-t border-gray-200">
          <div className="sim-meta-item flex items-center gap-1">
            <span className="rating text-[#f59e0b] font-semibold">★ 4.8</span>
          </div>
          <div className="sim-meta-item flex items-center gap-1">⏱ 20 min</div>
          <div className="sim-meta-item flex items-center gap-1">👁 12.5k</div>
                </div>
            </div>
        </div>
  );
};

export default SimulationsListPage;
