
import React from 'react';
import { MOCK_SUBJECTS } from '../constants';
import type { Lesson, Subject } from '../types';
import { BeakerIcon } from './Icons';

interface SimulationsViewProps {
  activeSimulationId: string | null;
  onSelectSimulation: (simulationId: string) => void;
}

const SimulationsView: React.FC<SimulationsViewProps> = ({ activeSimulationId, onSelectSimulation }) => {
  let activeLesson: Lesson | null = null;
  let activeSubject: Subject | null = null;
  let subjectSimulations: Lesson[] = [];

  if (activeSimulationId) {
    for (const subject of MOCK_SUBJECTS) {
      for (const module of subject.modules) {
        const foundLesson = module.lessons.find(l => l.id === activeSimulationId);
        if (foundLesson && foundLesson.content.type === 'simulation') {
          activeLesson = foundLesson;
          activeSubject = subject;
          break;
        }
      }
      if (activeLesson) break;
    }
  }

  if (activeSubject) {
    activeSubject.modules.forEach(module => {
        module.lessons.forEach(lesson => {
            if (lesson.content.type === 'simulation') {
                subjectSimulations.push(lesson);
            }
        });
    });
  }

  if (!activeLesson || activeLesson.content.type !== 'simulation') {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
        <BeakerIcon className="w-24 h-24 text-brand-primary/20 mb-4" />
        <h2 className="text-2xl font-bold text-brand-dark">Welcome to the Simulation Center</h2>
        <p className="max-w-md mt-2">Select a simulation from the sidebar to begin your interactive learning experience.</p>
      </div>
    );
  }

  const SimulationComponent = activeLesson.content.component;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-brand-dark">{activeLesson.title}</h1>
          <div className="flex items-center space-x-2 mt-2">
            <p className="text-gray-600">{activeSubject?.name}</p>
            <span className="text-gray-300">&bull;</span>
            {activeLesson.content.level.map(level => (
              <span key={level} className="px-2 py-0.5 text-xs font-semibold text-brand-primary bg-brand-primary/10 rounded-full">
                {level}
              </span>
            ))}
          </div>
        </div>
        <div className="mt-4 sm:mt-0">
            <select
                value={activeSimulationId ?? ''}
                onChange={(e) => onSelectSimulation(e.target.value)}
                className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
            >
                <option value="" disabled>Switch Simulation...</option>
                {subjectSimulations.map(sim => (
                    <option key={sim.id} value={sim.id}>{sim.title}</option>
                ))}
            </select>
        </div>
      </div>
      
      <div className="mt-6">
        <div className="bg-gray-900 rounded-lg shadow-lg overflow-hidden aspect-video relative small-view-container">
             <SimulationComponent />
        </div>
      </div>
      <style>{`
        /* For screens 576px and below: fix height at 475px (value at 576px width), keep width responsive */
        @media (max-width: 576px) {
          .small-view-container {
            aspect-ratio: auto !important;
            height: 475px !important;
            min-height: 475px !important;
            max-height: 475px !important;
          }
        }
      `}</style>

      <div className="bg-white rounded-lg shadow-lg p-6 mt-8">
        <h2 className="text-2xl font-bold text-brand-dark mb-4">About this Simulation</h2>
        <p className="prose max-w-none text-gray-700">{activeLesson.content.description}</p>
      </div>
    </div>
  );
};

export default SimulationsView;
