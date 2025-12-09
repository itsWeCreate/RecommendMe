
import React, { useState, useEffect } from "react";
import RoleSelector from "./components/RoleSelector";
import AdminConfig from "./components/AdminConfig";
import RecommenderTool from "./components/RecommenderTool";
import { AppMode, ProgramContext } from "./types";

const DEFAULT_CONTEXT: ProgramContext = {
  applicantName: "Jeffrey Clarke",
  targetProgramName: "PosseNext Alumni Fellowship",
  submissionDeadline: "2025-12-09",
  opportunityContext: `An invite-only prestigious fellowship focusing on leadership development and community impact for early career Posse Alum. 

After 36 years, Posse boasts more than 8,000 graduates. The PosseNext Fellows Program is a career accelerator for exceptional Posse alumni.

Twenty-five Posse Alumni will be selected as the very first cohort of PosseNext Fellows. These Fellows will participate in an exclusive three-month program that will fit their current schedule and responsibilities. PosseNext Fellows will:
- Get matched with an executive coach in the industry of their interest and experience;
- Receive access to a private speaker series with industry leaders and experts;
- Attend an all-expense-paid kickoff retreat;
- Receive a $2,500 stipend.

Recommendations should emphasize leadership, values, and professional vision — not just accomplishments, but how the applicant embodies these qualities consistently.`,
  coreQualities: [
    "Leadership & Teamwork", 
    "Commitment to Posse Values", 
    "Professional Growth & Vision"
  ],
  specificAnecdotes: [
      "Share specific examples of when you took initiative, guided a team, or influenced outcomes. Emphasize consistency of leadership across professional, academic, and community settings.", 
      "Show how you embody Posse’s mission of diversity, equity, and collaboration. Provide anecdotes of applying Posse values in real-world contexts (workplace, graduate school, civic engagement).", 
      "Speak to your trajectory: how you’ve grown, adapted, and taken on increasing responsibility. Reinforce your clarity of vision and ability to translate ambition into action."
  ],
  googleAppsScriptUrl: "https://script.google.com/macros/s/AKfycbwkIw4nGbYnV0QkROmAVzvfOYFE0QZrpPOPdvdCKbgItIlHNjB0gUHQi7Gotq8Nt3M/exec",
  customQuestions: []
};

export default function App() {
  const [appMode, setAppMode] = useState<AppMode>("select");
  
  // Initialize state from LocalStorage if available, otherwise use default
  const [programContext, setProgramContext] = useState<ProgramContext>(() => {
    try {
      const saved = localStorage.getItem('recLetterContext');
      if (saved) {
        const parsed = JSON.parse(saved);
        
        // Data Migration: Check if customQuestions uses old string format
        let validQuestions = parsed.customQuestions;
        if (Array.isArray(validQuestions) && validQuestions.length > 0 && typeof validQuestions[0] === 'string') {
           console.log("Migrating legacy question format...");
           validQuestions = []; // Reset old string-based questions to force regeneration
        }

        // Merge defaults to ensure new fields (like the URL) populate if missing/empty in old data
        return { 
            ...DEFAULT_CONTEXT, 
            ...parsed,
            googleAppsScriptUrl: parsed.googleAppsScriptUrl || DEFAULT_CONTEXT.googleAppsScriptUrl,
            customQuestions: validQuestions || []
        };
      }
      return DEFAULT_CONTEXT;
    } catch (e) {
      console.error("Failed to load context from local storage", e);
      return DEFAULT_CONTEXT;
    }
  });

  // Persist state to LocalStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('recLetterContext', JSON.stringify(programContext));
    } catch (e) {
      console.error("Failed to save context to local storage", e);
    }
  }, [programContext]);

  const renderContent = () => {
    switch (appMode) {
      case 'select':
        return <RoleSelector setAppMode={setAppMode} />;
      case 'admin':
        return (
          <AdminConfig 
            programContext={programContext} 
            setProgramContext={setProgramContext} 
            setAppMode={setAppMode} 
          />
        );
      case 'recommender':
        return (
          <RecommenderTool 
            programContext={programContext} 
            setAppMode={setAppMode} 
          />
        );
      default:
        return <RoleSelector setAppMode={setAppMode} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4 font-sans text-gray-800">
      <div className="w-full max-w-4xl flex flex-col items-center">
        {/* Header Logo Area */}
        <div className="mb-8 flex flex-col items-center">
             <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-purple-200 mb-4 transform hover:rotate-3 transition-transform duration-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
            </div>
            <h1 className="text-lg font-bold text-gray-400 tracking-widest uppercase">RecLetter AI</h1>
        </div>

        {renderContent()}
      </div>
    </div>
  );
}
