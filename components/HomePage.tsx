
import React from 'react';
import type { View } from '../App';
import Footer from './Footer';

interface HomePageProps {
  onNavigate: (view: View) => void;
}

const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  return (
    <div className="bg-white min-h-screen">
      {/* Header */}
      <header className="header bg-white border-b border-gray-200 sticky top-0 z-[100] shadow-sm">
        <div className="header-content max-w-full mx-auto px-6 py-4 flex items-center justify-between">
          <div className="header-left flex items-center gap-4">
            <div className="logo text-2xl font-bold text-[#0056d2]">🔬 STEM Lab</div>
          </div>
          <nav className="nav hidden md:flex gap-8 items-center">
            <a href="#" className="text-[#1f1f1f] font-medium hover:text-[#0056d2] transition-colors no-underline">Explore</a>
            <a href="#" className="text-[#1f1f1f] font-medium hover:text-[#0056d2] transition-colors no-underline">Subjects</a>
            <a href="#" className="text-[#1f1f1f] font-medium hover:text-[#0056d2] transition-colors no-underline">For Teachers</a>
            <a href="#" className="text-[#1f1f1f] font-medium hover:text-[#0056d2] transition-colors no-underline">About</a>
            <button className="btn btn-primary bg-[#0056d2] text-white px-6 py-2.5 rounded font-semibold hover:bg-[#0043a8] transition-all border-none cursor-pointer text-sm">
              Sign In
            </button>
            </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero bg-gradient-to-br from-[#0056d2] to-[#0043a8] text-white py-20 px-6 text-center">
        <div className="hero-content max-w-[900px] mx-auto">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            Learn Science Through Interactive Simulations
          </h1>
          <p className="text-xl opacity-95 mb-10 leading-relaxed">
            Explore chemistry, physics, biology, and mathematics with hands-on virtual experiments. Perfect for students, teachers, and lifelong learners.
          </p>
            <div className="hero-actions flex gap-4 justify-center flex-wrap">
            <button 
              onClick={() => onNavigate('simulationsList')} 
              className="btn btn-primary bg-white text-[#0056d2] px-8 py-4 rounded font-semibold text-base hover:bg-gray-100 transition-all"
            >
              Get Started Free
            </button>
            <button 
              onClick={() => onNavigate('simulationsList')} 
              className="btn btn-outline bg-transparent border-2 border-white text-white px-8 py-4 rounded font-semibold text-base hover:bg-white hover:text-[#0056d2] transition-all"
            >
              Browse Simulations
            </button>
            </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="stats-bar bg-white py-10 px-6 border-b border-gray-200">
        <div className="stats-content max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-10 text-center">
            <div className="stat-item">
            <h3 className="text-4xl font-bold text-[#0056d2] mb-2">500+</h3>
                <p className="text-base text-gray-600">Interactive Simulations</p>
            </div>
            <div className="stat-item">
            <h3 className="text-4xl font-bold text-[#0056d2] mb-2">100K+</h3>
                <p className="text-base text-gray-600">Active Students</p>
            </div>
            <div className="stat-item">
            <h3 className="text-4xl font-bold text-[#0056d2] mb-2">50+</h3>
                <p className="text-base text-gray-600">Countries Worldwide</p>
            </div>
            <div className="stat-item">
            <h3 className="text-4xl font-bold text-[#0056d2] mb-2">4.8★</h3>
                <p className="text-base text-gray-600">Average Rating</p>
            </div>
        </div>
      </section>

      {/* Subjects Section */}
      <section className="section py-20 px-6 max-w-7xl mx-auto">
        <div className="section-header text-center mb-14">
          <h2 className="text-4xl font-bold mb-4 text-[#1f1f1f]">Explore by Subject</h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Choose from our comprehensive collection of science simulations across multiple disciplines
          </p>
        </div>
        <div className="subjects-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
          <SubjectCard 
            emoji="⚗️" 
            title="Chemistry" 
            description="Explore chemical reactions, molecular structures, and laboratory techniques through interactive simulations." 
            simCount={156} 
            gradient="from-[#0056d2] to-[#00c6ff]"
            onClick={() => onNavigate('simulationsList')} 
          />
          <SubjectCard 
            emoji="⚡" 
            title="Physics" 
            description="Master mechanics, electricity, magnetism, and quantum physics with visual experiments." 
            simCount={142} 
            gradient="from-[#f093fb] to-[#f5576c]"
            onClick={() => onNavigate('simulationsList')} 
          />
          <SubjectCard 
            emoji="🧬" 
            title="Biology" 
            description="Discover cellular processes, genetics, ecology, and human anatomy through immersive labs." 
            simCount={128} 
            gradient="from-[#4facfe] to-[#00f2fe]"
            onClick={() => onNavigate('simulationsList')} 
          />
          <SubjectCard 
            emoji="🔢" 
            title="Mathematics" 
            description="Visualize mathematical concepts, from algebra to calculus, with interactive tools." 
            simCount={98} 
            gradient="from-[#43e97b] to-[#38f9d7]"
            onClick={() => onNavigate('simulationsList')} 
          />
        </div>
      </section>

      {/* Features Section */}
      <section className="section py-20 px-6 bg-[#f8f9fa]">
        <div className="section-header text-center mb-14 max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold mb-4 text-[#1f1f1f]">Why Choose STEM Lab?</h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            The most comprehensive platform for interactive science education
          </p>
        </div>
        <div className="features-grid grid grid-cols-1 md:grid-cols-3 gap-10 max-w-7xl mx-auto">
          <FeatureItem 
            icon="🎯" 
            title="Hands-On Learning" 
            description="Learn by doing with interactive simulations that let you experiment, make mistakes, and discover concepts naturally."
          />
          <FeatureItem 
            icon="📊" 
            title="Track Progress" 
            description="Monitor your learning journey with detailed analytics, achievements, and personalized recommendations."
          />
          <FeatureItem 
            icon="👥" 
            title="Expert Content" 
            description="All simulations are created and reviewed by experienced educators and subject matter experts."
          />
        </div>
      </section>

      {/* Popular Simulations */}
      <section className="section py-20 px-6 max-w-7xl mx-auto">
        <div className="section-header text-center mb-14">
          <h2 className="text-4xl font-bold mb-4 text-[#1f1f1f]">Popular Simulations</h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Start with these highly-rated experiments loved by students worldwide
          </p>
        </div>
        <div className="simulations-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <SimCard 
            category="Chemistry"
            title="Acid-Base Titration Lab"
            description="Learn the fundamentals of acid-base titration using virtual burettes and indicators."
            difficulty="Beginner"
            rating={4.8}
            duration="20 min"
            views="12.5k"
            gradient="from-[#0056d2] to-[#00c6ff]"
            onClick={() => onNavigate('simulationsList')}
          />
          <SimCard
            category="Physics"
            title="Projectile Motion"
            description="Explore kinematics and projectile trajectories with adjustable parameters."
            difficulty="Intermediate"
            rating={4.9}
            duration="25 min"
            views="18.2k"
            gradient="from-[#f093fb] to-[#f5576c]"
            onClick={() => onNavigate('simulationsList')}
          />
          <SimCard 
            category="Biology"
            title="Cell Structure Explorer"
            description="Navigate through plant and animal cells to understand cellular components."
            difficulty="Beginner"
            rating={4.7}
            duration="15 min"
            views="22.1k"
            gradient="from-[#4facfe] to-[#00f2fe]"
            onClick={() => onNavigate('simulationsList')}
          />
        </div>
      </section>
      
       {/* CTA Section */}
      <section className="cta-section bg-gradient-to-br from-[#0056d2] to-[#0043a8] text-white py-20 px-6 text-center">
        <div className="cta-content max-w-4xl mx-auto">
                <h2 className="text-4xl font-bold mb-5">Ready to Start Learning?</h2>
          <p className="text-lg mb-8 opacity-95">
            Join thousands of students and educators using STEM Lab to make science education engaging and effective.
          </p>
          <button className="btn btn-outline bg-transparent border-2 border-white text-white px-8 py-3 rounded font-semibold text-lg hover:bg-white hover:text-[#0056d2] transition-all">
            Create Free Account
          </button>
            </div>
        </section>

      <Footer />
    </div>
  );
};

const SubjectCard: React.FC<{
  emoji: string;
  title: string;
  description: string;
  simCount: number;
  gradient: string;
  onClick: () => void;
}> = ({ emoji, title, description, simCount, gradient, onClick }) => (
  <div 
    onClick={onClick} 
    className="subject-card bg-white rounded-xl overflow-hidden shadow-lg transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl cursor-pointer no-underline text-inherit"
  >
    <div className={`subject-icon h-[200px] flex items-center justify-center text-8xl bg-gradient-to-br ${gradient}`}>
            {emoji}
        </div>
        <div className="subject-content p-6">
            <h3 className="text-2xl font-bold mb-3">{title}</h3>
      <p className="text-sm text-gray-600 mb-4 leading-relaxed">{description}</p>
      <div className="subject-meta flex gap-4 text-xs text-gray-500">
                <span>{simCount} Simulations</span>
        <span>•</span>
                <span>All Levels</span>
            </div>
        </div>
    </div>
);

const FeatureItem: React.FC<{
  icon: string;
  title: string;
  description: string;
}> = ({ icon, title, description }) => (
  <div className="feature-item text-center">
    <div className="feature-icon w-20 h-20 bg-gradient-to-br from-[#667eea] to-[#764ba2] rounded-full flex items-center justify-center text-4xl mx-auto mb-6">
      {icon}
    </div>
    <h3 className="text-2xl font-bold mb-3">{title}</h3>
    <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
  </div>
);

const SimCard: React.FC<{
  category: string;
  title: string;
  description: string;
  difficulty: string;
  rating: number;
  duration: string;
  views: string;
  gradient: string;
  onClick: () => void;
}> = ({ category, title, description, difficulty, rating, duration, views, gradient, onClick }) => (
  <div 
    onClick={onClick}
    className="sim-card bg-white rounded-lg overflow-hidden shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl cursor-pointer no-underline text-inherit"
  >
    <div className={`sim-thumbnail w-full h-44 bg-gradient-to-br ${gradient} relative`}>
      <div className="difficulty-badge absolute top-3 right-3 bg-white/95 px-3 py-1 rounded-full text-xs font-semibold text-[#059669]">
        {difficulty}
      </div>
    </div>
    <div className="sim-content p-5">
      <div className="sim-category text-xs font-bold text-[#0056d2] uppercase tracking-wide mb-2">{category}</div>
      <h3 className="sim-title text-lg font-bold mb-2 text-[#1f1f1f]">{title}</h3>
      <p className="sim-description text-sm text-gray-600 mb-4 leading-relaxed">{description}</p>
      <div className="sim-meta flex gap-4 text-sm text-gray-600 pt-4 border-t border-gray-200">
        <span className="rating text-[#f59e0b] font-semibold">★ {rating}</span>
        <span>⏱ {duration}</span>
        <span>👁 {views}</span>
      </div>
    </div>
  </div>
);

export default HomePage;
