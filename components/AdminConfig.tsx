
import React, { useState } from "react";
import { ProgramContext, AppMode } from "../types";
import { generateInterviewQuestions } from "../services/geminiService";

interface AdminConfigProps {
  programContext: ProgramContext;
  setProgramContext: React.Dispatch<React.SetStateAction<ProgramContext>>;
  setAppMode: (mode: AppMode) => void;
}

const AdminConfig: React.FC<AdminConfigProps> = ({ programContext, setProgramContext, setAppMode }) => {
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);

  const updateContext = (field: keyof ProgramContext, value: any) => {
    setProgramContext(prev => {
        const newState = { ...prev, [field]: value };
        // If critical fields change, clear the custom questions so user is prompted to regenerate
        if (['applicantName', 'targetProgramName', 'opportunityContext'].includes(field)) {
             newState.customQuestions = []; 
        }
        return newState;
    });
  };

  const updateArrayField = (field: 'coreQualities' | 'specificAnecdotes', index: number, value: string) => {
    setProgramContext(prev => {
        const newArray = [...(prev[field] || [])];
        newArray[index] = value;
        const newState = { ...prev, [field]: newArray };
        newState.customQuestions = []; // Clear questions on context change
        return newState;
    });
  };

  const updateQuestionText = (index: number, text: string) => {
      setProgramContext(prev => {
          if (!prev.customQuestions) return prev;
          const newQuestions = [...prev.customQuestions];
          newQuestions[index] = { ...newQuestions[index], text };
          return { ...prev, customQuestions: newQuestions };
      });
  };

  const handleGenerateQuestions = async () => {
    setIsGeneratingQuestions(true);
    try {
      // Generate generic questions if no recommender info is known yet at admin stage
      const questions = await generateInterviewQuestions(programContext);
      updateContext('customQuestions', questions);
    } catch (e) {
      console.error(e);
      alert("Failed to generate questions. Please try again.");
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  const saveToSheets = async () => {
    setSaveStatus('saving');
    const { googleAppsScriptUrl } = programContext;
    
    if (!googleAppsScriptUrl) {
        setSaveStatus('error');
        alert("Please provide the Web App URL.");
        return;
    }
    
    console.log("Attempting to save to:", googleAppsScriptUrl);

    try {
        const questionTexts = programContext.customQuestions 
            ? programContext.customQuestions.map(q => q.text || "").join(" | ")
            : "";

        const payload = {
            values: [
                new Date().toISOString(),
                programContext.applicantName,
                programContext.targetProgramName,
                programContext.opportunityContext,
                programContext.submissionDeadline,
                programContext.coreQualities.join(", "),
                programContext.specificAnecdotes.join(" | "),
                questionTexts
            ]
        };
        
        console.log("Payload:", payload);

        // using no-cors because GAS web apps don't return CORS headers for simple POSTs
        await fetch(googleAppsScriptUrl, {
            method: "POST",
            mode: "no-cors", 
            headers: { "Content-Type": "text/plain" },
            body: JSON.stringify(payload)
        });

        console.log("Request sent successfully.");
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 3000);

    } catch (e) {
        console.error("Save failed:", e);
        setSaveStatus('error');
    }
  };

  return (
    <div className="w-full max-w-3xl space-y-6 animate-fade-in pb-12">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-extrabold text-gray-900">Applicant Setup</h2>
        <button onClick={() => setAppMode('select')} className="text-sm text-gray-500 hover:text-purple-600 font-medium transition-colors">
          Cancel
        </button>
      </div>

      <div className="space-y-6">
        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                <label className="font-bold text-gray-800 text-sm mb-2 block uppercase tracking-wide">Applicant Name</label>
                <input
                type="text"
                className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all outline-none"
                value={programContext.applicantName}
                onChange={(e) => updateContext('applicantName', e.target.value)}
                placeholder="John Doe"
                />
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                <label className="font-bold text-gray-800 text-sm mb-2 block uppercase tracking-wide">Target Program</label>
                <input
                type="text"
                className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all outline-none"
                value={programContext.targetProgramName}
                onChange={(e) => updateContext('targetProgramName', e.target.value)}
                placeholder="Fellowship / Job Title"
                />
            </div>
        </div>

        {/* Opportunity Context */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <label className="font-bold text-gray-900 text-lg mb-2 block">Opportunity Context</label>
            <p className="text-sm text-gray-500 mb-4">Provide details about the program. This helps AI tailor the questions.</p>
            <textarea
                className="w-full p-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 text-sm placeholder-gray-400 bg-gray-50 focus:bg-white outline-none transition-all resize-y min-h-[100px]"
                rows={4}
                value={programContext.opportunityContext || ""}
                onChange={(e) => updateContext('opportunityContext', e.target.value)}
                placeholder="e.g. This fellowship specifically looks for leaders who have overcome adversity..."
            />
        </div>

        {/* Qualities */}
        <div className="bg-white p-6 rounded-3xl shadow-lg border border-gray-100">
          <label className="font-bold text-gray-900 text-lg mb-2 block flex items-center">
             <span className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mr-3 text-sm">2</span>
             Top Qualities & Evidence
          </label>
          <p className="text-sm text-gray-500 mb-6 pl-11">Define 3 core qualities the program seeks, and provide a context reminder.</p>
          
          <div className="space-y-6 pl-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="relative pl-6 border-l-2 border-gray-100 hover:border-purple-300 transition-colors">
                <div className="space-y-3">
                  <input
                    type="text"
                    className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 font-semibold placeholder-gray-400 outline-none transition-all"
                    value={programContext.coreQualities[i]}
                    onChange={(e) => updateArrayField('coreQualities', i, e.target.value)}
                    placeholder={`Quality ${i + 1} (e.g., Resilience)`}
                  />
                  <textarea
                    className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 text-sm placeholder-gray-400 bg-gray-50 focus:bg-white outline-none transition-all resize-none"
                    rows={2}
                    value={programContext.specificAnecdotes[i]}
                    onChange={(e) => updateArrayField('specificAnecdotes', i, e.target.value)}
                    placeholder={`Specific anecdote for Quality ${i + 1}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Interview Questions Generator */}
        <div className="bg-white p-6 rounded-3xl shadow-lg border-2 border-indigo-50">
            <div className="flex justify-between items-center mb-4">
                <label className="font-bold text-gray-900 text-lg flex items-center">
                    <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mr-3 text-sm">3</span>
                    Interview Questions
                </label>
                <button
                    onClick={handleGenerateQuestions}
                    disabled={isGeneratingQuestions}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                    {isGeneratingQuestions ? 'Generating...' : 'Generate with AI'}
                </button>
            </div>
            <p className="text-sm text-gray-500 mb-4 pl-11">Review questions. The specific wording will be re-tailored when the recommender selects their relationship, but these act as the base.</p>
            
            {(!programContext.customQuestions || programContext.customQuestions.length === 0) ? (
                 <div className="pl-11 text-gray-400 italic text-sm">
                    No custom questions yet.
                 </div>
            ) : (
                <div className="space-y-3 pl-2">
                    {programContext.customQuestions.map((q, i) => (
                        <div key={i} className="relative pl-6">
                            <input
                                type="text"
                                className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 text-sm bg-indigo-50/30"
                                value={q.text}
                                onChange={(e) => updateQuestionText(i, e.target.value)}
                            />
                             <div className="text-xs text-indigo-400 mt-1 flex gap-2">
                                <span>Focus: {q.focusQuality}</span>
                                <span className="text-gray-300">|</span>
                                <span className="truncate max-w-xs opacity-70">Context: {q.contextContext}</span>
                             </div>
                        </div>
                    ))}
                </div>
            )}
        </div>

        {/* Deadline */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
                <label className="font-bold text-gray-900 block">Submission Deadline</label>
            </div>
            <input
                type="date"
                className="p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 outline-none text-gray-700"
                value={programContext.submissionDeadline}
                onChange={(e) => updateContext('submissionDeadline', e.target.value)}
            />
        </div>
        
        {/* Google Apps Script Integration */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 bg-green-50/50">
            <div className="flex items-center gap-2 mb-2">
                <label className="font-bold text-gray-900 text-lg">Google Sheets Integration</label>
            </div>
            
            <div className="mb-2">
                 <input
                    type="text"
                    className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 text-sm"
                    value={programContext.googleAppsScriptUrl || ""}
                    onChange={(e) => updateContext('googleAppsScriptUrl', e.target.value)}
                    placeholder="Web App URL"
                />
            </div>
            <p className="text-xs text-green-700 mb-4 bg-green-100 p-2 rounded border border-green-200">
                <strong>Important:</strong> Ensure your Google Script deployment has <em>"Who has access"</em> set to <strong>"Anyone"</strong>. Otherwise, the app cannot save data.
            </p>
            
            <button
                onClick={saveToSheets}
                disabled={saveStatus === 'saving'}
                className={`w-full py-2 rounded-xl font-bold text-sm transition-all ${
                    saveStatus === 'saving' ? 'bg-gray-300 text-gray-500' :
                    saveStatus === 'success' ? 'bg-green-600 text-white' :
                    saveStatus === 'error' ? 'bg-red-500 text-white' :
                    'bg-green-100 text-green-700 hover:bg-green-200'
                }`}
            >
                {saveStatus === 'saving' ? 'Saving...' : 
                 saveStatus === 'success' ? 'Saved!' : 
                 saveStatus === 'error' ? 'Failed' :
                 'Save Configuration'}
            </button>
        </div>

        <div className="pt-4 space-y-3">
          <button
            onClick={() => setAppMode("recommender")}
            className="w-full py-4 rounded-2xl bg-gray-900 text-white font-bold shadow-xl hover:bg-gray-800 transition-all duration-300 flex items-center justify-center gap-2"
          >
            Go to Recommender Tool 
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminConfig;
