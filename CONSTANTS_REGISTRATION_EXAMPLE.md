# Constants Registration Example

This file shows exactly how to register a new simulation in `constants.ts`.

## Example: Adding a New Physics Simulation

### Step 1: Import the Wrapper Component

```typescript
// At the top of constants.ts, add:
import YourSimulatorWrapper from './components/simulations/YourSimulatorWrapper';
```

### Step 2: Add to the Subject's Lessons Array

```typescript
// In constants.ts, find the appropriate subject (e.g., 'physics')
// Then find the appropriate module (e.g., 'newtonian-mechanics')
// Add your simulation to the lessons array:

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
          // ... existing lessons ...
          
          // Add your new simulation here:
          { 
            id: 'nm-your-simulation-id',  // Unique ID
            title: 'Your Simulation Name',  // Display name
            content: {
              type: 'simulation',
              level: ['Grade 11', 'A-Level'],  // Educational levels
              description: 'Brief description of what the simulation demonstrates.',
              component: YourSimulatorWrapper,  // Your wrapper component
            }
          },
          
          // ... more lessons ...
        ],
      },
      // ... more modules ...
    ],
  },
  // ... more subjects ...
];
```

## Complete Example

Here's a complete example showing how Projectile Motion is registered:

```typescript
import ProjectileMotionSimulatorWrapper from './components/simulations/ProjectileMotionSimulatorWrapper';

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
              body: 'A force is a push or a pull...' 
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
        ],
      },
    ],
  },
];
```

## Field Descriptions

### `id` (string, required)
- Unique identifier for the lesson
- Format: `{module-id}-{lesson-number}` or `{module-id}-{descriptive-name}`
- Example: `'nm-2'`, `'titration-1'`, `'nm-projectile-motion'`

### `title` (string, required)
- Display name shown in the UI
- Should be clear and descriptive
- Example: `'Projectile Motion'`, `'Acid-Base Titration Lab'`

### `content.type` (string, required)
- Must be `'simulation'` for simulations
- Other types: `'tutorial'`, `'quiz'`

### `content.level` (string[], optional)
- Educational levels this simulation is appropriate for
- Common values: `['Grade 11']`, `['A-Level']`, `['Grade 11', 'A-Level']`

### `content.description` (string, optional)
- Brief description shown in the UI
- Should explain what the simulation demonstrates

### `content.component` (React.Component, required)
- The wrapper component for your simulation
- Must be the wrapper, not the core simulator
- Example: `ProjectileMotionSimulatorWrapper`

## Multiple Subjects/Modules

You can add the same simulation to multiple subjects or modules:

```typescript
// Physics module
{
  id: 'physics',
  modules: [
    {
      id: 'mechanics',
      lessons: [
        { id: 'mech-1', title: 'Your Sim', content: { type: 'simulation', component: YourSimulatorWrapper } }
      ]
    }
  ]
},
// Chemistry module
{
  id: 'chemistry',
  modules: [
    {
      id: 'reactions',
      lessons: [
        { id: 'react-1', title: 'Your Sim', content: { type: 'simulation', component: YourSimulatorWrapper } }
      ]
    }
  ]
}
```

## Notes

- **Always use the wrapper component**, not the core simulator component
- **IDs must be unique** across all lessons
- **Component import** must be at the top of the file
- **Description** helps users understand what the simulation does

## Testing Registration

After adding your simulation:

1. Navigate to the subject page
2. Find your module
3. Click on your simulation lesson
4. Verify it loads correctly

If it doesn't appear:
- Check that the import path is correct
- Verify the component is exported correctly
- Check for console errors
- Ensure the ID is unique


