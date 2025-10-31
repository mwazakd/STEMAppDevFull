
import type { ElementType } from 'react';

export interface User {
  name: string;
  avatarUrl: string;
}

export interface Comment {
  id: string;
  author: User;
  content: string;
  timestamp: string;
  upvotes: number;
}

export interface Post {
  id: string;
  author: User;
  title: string;
  content: string;
  tags: string[];
  upvotes: number;
  comments: Comment[];
  timestamp: string;
  saved: boolean;
}

// --- New Discriminated Union for Lesson Content ---

export interface SimulationContent {
  type: 'simulation';
  level: string[];
  description: string;
  component: ElementType;
}

export interface TutorialContent {
  type: 'tutorial';
  body: string;
}

export interface QuizContent {
  type: 'quiz';
  questions: any[]; // Placeholder for quiz questions
}

export type LessonContent = SimulationContent | TutorialContent | QuizContent;

export interface Lesson {
  id: string;
  title: string;
  content: LessonContent;
}

export interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
}

export interface Subject {
  id: string;
  name: string;
  icon: ElementType;
  modules: Module[];
}

export interface ChatMessage {
    id: string;
    text: string;
    sender: 'user' | 'bot';
    isLoading?: boolean;
}
