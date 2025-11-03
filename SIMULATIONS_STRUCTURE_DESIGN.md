# STEM Africa - Simulations Structure Design

## Overview
This document outlines the proposed structure for the simulations section of the STEM Africa app.

## Page Structure

### 1. Main Simulations Page (`?view=simulationsList`)
**Purpose**: Overview of all simulations across all subjects

**Layout**:
```
┌─────────────────────────────────────────────────┐
│  Hero Section                                    │
│  "Explore Interactive Simulations"               │
│  "Learn by doing with virtual labs"              │
└─────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────┐
│  Chemistry Section                               │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐              │
│  │ Sim │ │ Sim │ │ Sim │ │ Sim │              │
│  │  1  │ │  2  │ │  3  │ │  4  │              │
│  └─────┘ └─────┘ └─────┘ └─────┘              │
│  [See More →]                                   │
└─────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────┐
│  Physics Section                                 │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐              │
│  │ Sim │ │ Sim │ │ Sim │ │ Sim │              │
│  └─────┘ └─────┘ └─────┘ └─────┘              │
│  [See More →]                                   │
└─────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────┐
│  Mathematics Section                             │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐              │
│  │ Sim │ │ Sim │ │ Sim │ │ Sim │              │
│  └─────┘ └─────┘ └─────┘ └─────┘              │
│  [See More →]                                   │
└─────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────┐
│  Biology Section                                 │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐              │
│  │ Sim │ │ Sim │ │ Sim │ │ Sim │              │
│  └─────┘ └─────┘ └─────┘ └─────┘              │
│  [See More →]                                   │
└─────────────────────────────────────────────────┘
```

**Features**:
- Each subject shows 3-4 featured simulations
- "See More" button navigates to subject-specific page
- Subject icon and color scheme
- Responsive grid layout

### 2. Subject-Specific Page (`?view=simulationsList&subject=chemistry`)
**Purpose**: Complete list of all simulations for a specific subject

**Layout** (using Chemistry as template):
```
┌─────────────────────────────────────────────────┐
│  Hero Section                                    │
│  Breadcrumb: Home > Simulations > Chemistry      │
│  "Chemistry Simulations"                         │
│  "Explore interactive chemistry experiments..."  │
└─────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────┐
│  Filters Bar                                     │
│  [Difficulty ▼] [Topic ▼] [Duration ▼] [Search]│
└─────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────┐
│  Results: 24 simulations    [Grid] [List]      │
└─────────────────────────────────────────────────┘
┌─────┐ ┌─────┐ ┌─────┐
│ Sim │ │ Sim │ │ Sim │
│  1  │ │  2  │ │  3  │
└─────┘ └─────┘ └─────┘
┌─────┐ ┌─────┐ ┌─────┐
│ Sim │ │ Sim │ │ Sim │
│  4  │ │  5  │ │  6  │
└─────┘ └─────┘ └─────┘
┌─────────────────────────────────────────────────┐
│  [« Previous] [1] [2] [3] [4] [Next »]         │
└─────────────────────────────────────────────────┘
```

**Features**:
- Subject-specific hero with gradient
- Full filtering and search
- Grid/List view toggle
- Pagination
- All simulations for that subject

## URL Structure

```typescript
// Main simulations overview
/view=simulationsList

// Subject-specific pages
/view=simulationsList&subject=chemistry
/view=simulationsList&subject=physics
/view=simulationsList&subject=math
/view=simulationsList&subject=biology

// Individual simulation
/view=simulations&simulationId=titration-1
```

## Component Structure

```
App.tsx
├── SimulationsListPage (Main)
│   ├── HeroSection (All Subjects)
│   ├── SubjectPreviewSection (for each subject)
│   │   ├── SubjectHeader
│   │   ├── SimulationPreviewGrid (3-4 cards)
│   │   └── SeeMoreButton
│   └── Footer
│
└── SimulationsListPage (Subject-Specific)
    ├── HeroSection (Subject-Specific)
    ├── FiltersBar
    ├── ResultsHeader
    ├── SimulationsGrid/List
    └── Pagination
```

## Data Flow

1. **Main Page**:
   - Groups simulations by subject from `MOCK_SUBJECTS`
   - Shows first 3-4 simulations per subject
   - "See More" button updates URL with `subject` parameter

2. **Subject Page**:
   - Reads `subject` parameter from URL
   - Filters simulations by subject
   - Shows all simulations for that subject
   - Supports filtering, searching, pagination

## Design Principles

1. **Consistency**: Same card design across all pages
2. **Navigation**: Clear breadcrumbs and back navigation
3. **Responsive**: Works on mobile, tablet, desktop
4. **Performance**: Lazy load simulations, paginate results
5. **Accessibility**: Proper ARIA labels, keyboard navigation

## Color Schemes per Subject

- **Chemistry**: Blue gradient (`from-[#0056d2] to-[#00c6ff]`)
- **Physics**: Pink/Red gradient (`from-[#f093fb] to-[#f5576c]`)
- **Biology**: Cyan gradient (`from-[#4facfe] to-[#00f2fe]`)
- **Mathematics**: Green gradient (`from-[#43e97b] to-[#38f9d7]`)

## Next Steps

1. Update URL state management to support `subject` parameter
2. Refactor `SimulationsListPage` to handle both views
3. Create reusable `SubjectPreviewSection` component
4. Update navigation handlers
5. Test routing and state persistence

