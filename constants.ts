
import type { Subject, Post, User } from './types';
import { PhysicsIcon, ChemistryIcon, BiologyIcon, MathIcon } from './components/Icons';
import ProjectileMotionSimulatorWrapper from './components/simulations/ProjectileMotionSimulatorWrapper';
import SimplePendulumSimulatorWrapper from './components/simulations/SimplePendulumSimulatorWrapper';
import TitrationSimulatorWrapper from './components/simulations/TitrationSimulatorWrapper';

export const MOCK_USER: User = {
  name: 'Amina Yusuf',
  avatarUrl: 'https://picsum.photos/seed/amina/100/100',
};

export const MOCK_SUBJECTS: Subject[] = [
  {
    id: 'physics',
    name: 'Physics',
    icon: PhysicsIcon,
    modules: [
      {
        id: 'newtonian-mechanics',
        title: 'Newtonian Mechanics',
        lessons: [
          { 
            id: 'nm-1', 
            title: 'Introduction to Forces', 
            content: {
              type: 'tutorial',
              body: 'A force is a push or a pull that can cause an object with mass to change its velocity...' 
            }
          },
          { 
            id: 'nm-2', 
            title: 'Projectile Motion', 
            content: {
              type: 'simulation',
              level: ['Grade 11', 'A-Level'],
              description: 'This simulation demonstrates how projectiles move under the constant force of gravity.',
              component: ProjectileMotionSimulatorWrapper,
            }
          },
          { 
            id: 'nm-3', 
            title: 'Simple Pendulum', 
            content: {
              type: 'simulation',
              level: ['Grade 11', 'A-Level'],
              description: 'Explore the motion of a simple pendulum with adjustable parameters. Observe how length, gravity, and air resistance affect the period and damping of oscillations.',
              component: SimplePendulumSimulatorWrapper,
            }
          },
          { 
            id: 'nm-4', 
            title: 'Mechanics Quiz', 
            content: {
              type: 'quiz',
              questions: []
            } 
          },
        ],
      },
      {
        id: 'electromagnetism',
        title: 'Electromagnetism',
        lessons: [
            { 
              id: 'em-1', 
              title: 'Electric Fields', 
              content: {
                type: 'tutorial',
                body: 'An electric field is a vector field that associates to each point in space the electrostatic force per unit of charge...'
              }
            },
        ]
      },
    ],
  },
  {
    id: 'chemistry',
    name: 'Chemistry',
    icon: ChemistryIcon,
    modules: [
      {
        id: 'acid-base-titration',
        title: 'Acid-Base Titration',
        lessons: [
          { 
            id: 'titration-1', 
            title: 'Acid-Base Titration Lab', 
            content: {
              type: 'simulation',
              level: ['Grade 11', 'A-Level'],
              description: 'Learn the fundamentals of acid-base titration using virtual burettes and indicators. Explore real-time pH changes and titration curves.',
              component: TitrationSimulatorWrapper,
            }
          },
        ],
      },
    ],
  },
  {
    id: 'biology',
    name: 'Biology',
    icon: BiologyIcon,
    modules: [],
  },
   {
    id: 'math',
    name: 'Mathematics',
    icon: MathIcon,
    modules: [],
  },
];

export const MOCK_POSTS: Post[] = [
  {
    id: 'post-1',
    author: { name: 'Kwame Nkrumah', avatarUrl: 'https://picsum.photos/seed/kwame/100/100' },
    title: "Having trouble understanding Newton's Second Law. Can anyone explain it simply?",
    content: "I'm working through the Newtonian Mechanics module and I'm stuck on F=ma. What does it actually mean in a real-world context, for example, with a car?",
    tags: ['physics', 'mechanics', 'newton'],
    upvotes: 128,
    timestamp: '3 hours ago',
    saved: false,
    comments: [
      {
        id: 'comment-1-1',
        author: { name: 'Ada Lovelace', avatarUrl: 'https://picsum.photos/seed/ada/100/100' },
        content: "Think of it this way: to move a heavy car (more mass), you need a much stronger push (more force) than to move a light bicycle. That's F=ma in action!",
        timestamp: '2 hours ago',
        upvotes: 42,
      },
       {
        id: 'comment-1-2',
        author: { name: 'Galileo Galilei', avatarUrl: 'https://picsum.photos/seed/galileo/100/100' },
        content: "Exactly! And if you push the bicycle and the car with the same force, the bicycle will accelerate much faster because it has less mass.",
        timestamp: '1 hour ago',
        upvotes: 25,
      }
    ],
  },
  {
    id: 'post-2',
    author: { name: 'Jane Goodall', avatarUrl: 'https://picsum.photos/seed/jane/100/100' },
    title: "How does DNA replication actually work?",
    content: "I'm looking for a good 3D simulation or interactive tutorial on DNA replication. Does anyone have recommendations?",
    tags: ['biology', 'dna', 'genetics'],
    upvotes: 95,
    timestamp: '1 day ago',
    saved: true,
    comments: [],
  },
];
