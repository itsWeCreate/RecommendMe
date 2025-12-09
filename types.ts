
export interface RecommenderInfo {
  name: string;
  title: string;
  company: string; // Added Organization/Company
  relationship: string;
  otherRelationship?: string;
}

export interface Question {
  id: string;
  text: string;
  focusQuality: string; // The core quality this relates to
  contextContext: string; // The applicant's anecdote provided as context
}

export interface ProgramContext {
  targetProgramName: string;
  opportunityContext: string; 
  coreQualities: string[];
  specificAnecdotes: string[];
  applicantName: string;
  submissionDeadline: string;
  googleAppsScriptUrl?: string;
  customQuestions?: Question[]; // Updated to store full objects
}

export interface SavedDraft {
  id: string;
  timestamp: string;
  content: string;
  label: string;
}

export type AppMode = 'select' | 'admin' | 'recommender';
export type InputMode = 'text' | 'audio' | null;

export interface AudioState {
  isRecording: boolean;
  audioUrl: string | null;
  audioBlob: Blob | null;
}
