
import React, { useState, useRef, useMemo, useEffect } from "react";
import { ProgramContext, InputMode, AppMode, RecommenderInfo, Question, SavedDraft } from "../types";
import { getTailoredQuestions, generateTemplateLetter } from "../services/letterGenerator";
import { generateLetterWithGemini, generateInterviewQuestions, transcribeAndAnalyzeAudio } from "../services/geminiService";

interface RecommenderToolProps {
  programContext: ProgramContext;
  setAppMode: (mode: AppMode) => void;
}

const RELATIONSHIP_OPTIONS = [
  "Direct Supervisor or Manager",
  "Dean of Graduate Program",
  "Mentor / Campus Liaison (Posse)",
  "Posse Mate",
  "Professional Mentor / Coach",
  "Former Supervisor",
  "Pastor / Spiritual Mentor",
  "Professor / Instructor",
  "Other"
];

// --- Extracted Components to prevent re-render focus loss ---

const QuestionWithTooltip = ({ q, index, transcription }: { q: Question, index: number, transcription?: string }) => (
    <div className="relative group w-full">
        <p className="font-bold text-gray-800 mb-2 text-lg leading-snug pr-8">
            {q.text}
        </p>
        
        {/* Info Icon */}
        <div className="absolute top-0 right-0">
            <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-500 flex items-center justify-center cursor-help">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
            </div>
            
            {/* Tooltip Content */}
            <div className="absolute right-0 top-8 w-64 p-4 bg-gray-900 text-white text-xs rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                <p className="font-bold text-purple-300 mb-1 uppercase tracking-wider">Focus: {q.focusQuality}</p>
                <div className="border-t border-gray-700 my-2"></div>
                <p className="text-gray-300">
                    <span className="font-bold text-gray-400">Context Provided:</span> "{q.contextContext}"
                </p>
                {/* Arrow */}
                <div className="absolute -top-2 right-2 w-4 h-4 bg-gray-900 transform rotate-45"></div>
            </div>
        </div>

        {/* Transcription Result */}
        {transcription && (
            <div className="mt-3 p-3 bg-green-50 rounded-xl border border-green-100 text-sm text-gray-700 animate-fade-in">
                <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="font-bold text-green-700 text-xs uppercase tracking-wide">Audio Transcript</span>
                </div>
                "{transcription}"
            </div>
        )}
    </div>
);

interface IntakeFormProps {
    recommenderInfo: RecommenderInfo;
    setRecommenderInfo: React.Dispatch<React.SetStateAction<RecommenderInfo>>;
    message: string;
    handleIntakeSubmit: () => void;
}

const IntakeForm: React.FC<IntakeFormProps> = ({ recommenderInfo, setRecommenderInfo, message, handleIntakeSubmit }) => (
    <div className="w-full max-w-lg bg-white p-8 rounded-3xl shadow-xl border border-gray-100 animate-fade-in-up text-left">
        <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Welcome, Recommender</h2>
        <p className="text-gray-500 mb-6">To tailor the interview process, please provide your details.</p>

        <div className="space-y-4">
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Your Name</label>
                <input 
                  type="text" 
                  className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 outline-none"
                  placeholder="Dr. Jane Smith"
                  value={recommenderInfo.name}
                  onChange={e => setRecommenderInfo(prev => ({...prev, name: e.target.value}))}
                />
            </div>
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Your Title / Role</label>
                <input 
                  type="text" 
                  className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 outline-none"
                  placeholder="Director of Operations"
                  value={recommenderInfo.title}
                  onChange={e => setRecommenderInfo(prev => ({...prev, title: e.target.value}))}
                />
            </div>
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Organization / Company</label>
                <input 
                  type="text" 
                  className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 outline-none"
                  placeholder="Acme University / Tech Corp"
                  value={recommenderInfo.company}
                  onChange={e => setRecommenderInfo(prev => ({...prev, company: e.target.value}))}
                />
            </div>
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Relationship to Applicant</label>
                <select 
                  className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 outline-none bg-white"
                  value={recommenderInfo.relationship}
                  onChange={e => setRecommenderInfo(prev => ({...prev, relationship: e.target.value}))}
                >
                    {RELATIONSHIP_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
            </div>
            {recommenderInfo.relationship === 'Other' && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Specify Relationship</label>
                  <input 
                      type="text" 
                      className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 outline-none"
                      value={recommenderInfo.otherRelationship}
                      onChange={e => setRecommenderInfo(prev => ({...prev, otherRelationship: e.target.value}))}
                  />
              </div>
            )}
            
            {message && <p className="text-red-500 font-medium text-sm">{message}</p>}

            <button 
              onClick={handleIntakeSubmit}
              className="w-full py-4 mt-4 rounded-2xl bg-purple-600 text-white font-bold shadow-lg hover:bg-purple-700 transition-all"
            >
                Start Recommendation
            </button>
        </div>
    </div>
);


const RecommenderTool: React.FC<RecommenderToolProps> = ({ programContext, setAppMode }) => {
  // --- States ---
  const [step, setStep] = useState<'intake' | 'tool'>('intake');
  const [recommenderInfo, setRecommenderInfo] = useState<RecommenderInfo>({ 
      name: '', 
      title: '', 
      company: '', 
      relationship: RELATIONSHIP_OPTIONS[0], 
      otherRelationship: '' 
  });
  
  // Default to text mode to show the written form immediately
  const [inputMode, setInputMode] = useState<InputMode>('text');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [letter, setLetter] = useState("");
  const [savedDrafts, setSavedDrafts] = useState<SavedDraft[]>([]);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isTailoringQuestions, setIsTailoringQuestions] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionMap, setTranscriptionMap] = useState<Record<string, string>>({});
  
  // Questions State (Can be generic from context, or tailored by AI based on Intake)
  const [activeQuestions, setActiveQuestions] = useState<Question[]>([]);

  // Audio State
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // --- Init ---
  useEffect(() => {
    // Initial load: Use questions from context if they exist, otherwise fallback
    if (programContext.customQuestions && programContext.customQuestions.length > 0) {
        setActiveQuestions(programContext.customQuestions);
    } else {
        setActiveQuestions(getTailoredQuestions(programContext));
    }
  }, [programContext]);

  // --- Persistence for Drafts ---
  useEffect(() => {
      try {
          const saved = localStorage.getItem('recommenderDrafts');
          if (saved) {
              setSavedDrafts(JSON.parse(saved));
          }
      } catch (e) {
          console.error("Failed to load drafts", e);
      }
  }, []);

  useEffect(() => {
      try {
          localStorage.setItem('recommenderDrafts', JSON.stringify(savedDrafts));
      } catch (e) {
          console.error("Failed to save drafts", e);
      }
  }, [savedDrafts]);


  // --- Intake Handler ---
  const handleIntakeSubmit = async () => {
    if (!recommenderInfo.name || !recommenderInfo.title) {
        setMessage("Please fill in your Name and Title.");
        return;
    }
    
    setStep('tool');
    setMessage("");

    // Trigger AI re-tailoring based on relationship
    setIsTailoringQuestions(true);
    try {
        const tailored = await generateInterviewQuestions(programContext, recommenderInfo);
        if (tailored && tailored.length > 0) {
            setActiveQuestions(tailored);
        }
    } catch (e) {
        console.error("Failed to tailor questions", e);
        // Fail silently and keep existing questions
    } finally {
        setIsTailoringQuestions(false);
    }
  };


  // --- Audio Handlers ---
  const startRecording = async () => {
    setMessage('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      
      recorderRef.current = recorder;
      chunksRef.current = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        setMessage("Recording saved. Ready to generate or transcribe.");
      };

      recorder.start();
      setIsRecording(true);
      setTranscriptionMap({}); // Reset transcript on new recording
      setMessage("Recording... Speak naturally.");
    } catch (err) {
      console.error(err);
      setMessage("Error: Microphone access denied.");
    }
  };

  const stopRecording = () => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
    }
    setIsRecording(false);
  };

  const handleTranscribe = async () => {
      if (!audioBlob) return;
      setIsTranscribing(true);
      setMessage("Analyzing audio... This may take a moment.");
      try {
          const map = await transcribeAndAnalyzeAudio(audioBlob, activeQuestions);
          setTranscriptionMap(map);
          setMessage("Audio analyzed! Check the Conversation Guide to see the matched answers.");
      } catch (e) {
          console.error(e);
          setMessage("Transcription failed.");
      } finally {
          setIsTranscribing(false);
      }
  };

  // --- Generation & Save Logic ---
  const handleGenerate = async (useAI: boolean) => {
    setMessage('');
    
    const hasText = Object.keys(answers).some(k => answers[k]?.trim());
    if (!hasText && !audioBlob) {
        setMessage("Please answer at least one question or record audio.");
        return;
    }

    if (useAI) {
      setIsGenerating(true);
      try {
        const generated = await generateLetterWithGemini(programContext, answers, audioBlob, recommenderInfo);
        setLetter(generated);
        setMessage("Draft generated by Gemini AI!");
        // Auto-save to drafts
        saveDraft(generated, "AI Generated");
      } catch (e) {
        console.error(e);
        setMessage("AI Generation failed. Falling back to template.");
        const template = generateTemplateLetter(programContext, answers, activeQuestions, recommenderInfo);
        setLetter(template);
        saveDraft(template, "Template (Fallback)");
      } finally {
        setIsGenerating(false);
      }
    } else {
      const template = generateTemplateLetter(programContext, answers, activeQuestions, recommenderInfo);
      setLetter(template);
      setMessage("Template draft generated.");
      saveDraft(template, "Template");
    }
  };

  const saveDraft = (content: string, label: string) => {
      const newDraft: SavedDraft = {
          id: Date.now().toString(),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          content: content,
          label: label
      };
      setSavedDrafts(prev => [newDraft, ...prev]);
  };

  const handleDownload = () => {
      if (!letter) return;
      const element = document.createElement("a");
      const file = new Blob([letter], { type: 'text/plain' });
      element.href = URL.createObjectURL(file);
      element.download = `Recommendation_${programContext.applicantName.replace(/\s/g, '_')}_Draft.txt`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
  };

  const restoreDraft = (draft: SavedDraft) => {
      setLetter(draft.content);
      setMessage(`Restored draft from ${draft.timestamp}`);
  };

  return (
    <div className="w-full max-w-4xl flex flex-col items-center text-center pb-20 animate-fade-in">
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Recommendation Builder</h1>
        <p className="text-lg text-gray-500 font-medium">Drafting for <span className="text-gray-900">{programContext.applicantName}</span></p>
        {recommenderInfo.name && <p className="text-sm text-purple-600 font-bold mt-1">Hello, {recommenderInfo.name}</p>}
      </div>

      {step === 'intake' && (
        <IntakeForm 
            recommenderInfo={recommenderInfo} 
            setRecommenderInfo={setRecommenderInfo}
            message={message}
            handleIntakeSubmit={handleIntakeSubmit}
        />
      )}

      {step === 'tool' && (
        <>
            <div className="w-full bg-white border border-indigo-100 rounded-2xl p-4 mb-8 flex flex-col sm:flex-row justify-between items-center shadow-sm max-w-3xl">
                <div className="text-left mb-2 sm:mb-0">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Opportunity</p>
                    <p className="text-indigo-900 font-bold">{programContext.targetProgramName}</p>
                </div>
                <div className="text-left sm:text-right">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Deadline</p>
                    <p className="text-red-500 font-bold">{programContext.submissionDeadline || "None"}</p>
                </div>
            </div>

            {/* Mode Toggle */}
            <div className="bg-gray-100 p-1.5 rounded-full flex gap-2 mb-10 w-full max-w-sm mx-auto shadow-inner">
                <button
                onClick={() => setInputMode("text")}
                className={`flex-1 py-2.5 rounded-full text-sm font-bold transition-all duration-200 ${
                    inputMode === 'text' ? 'bg-white text-gray-900 shadow-md' : 'text-gray-500 hover:text-gray-700'
                }`}
                >
                Written Response
                </button>
                <button
                disabled
                className={`flex-1 py-2.5 rounded-full text-sm font-bold transition-all duration-200 text-gray-400 cursor-not-allowed`}
                >
                Voice Mode (Disabled)
                </button>
            </div>

            {message && (
                <div className={`w-full max-w-lg p-3 mb-6 rounded-xl text-sm font-medium animate-pulse ${
                message.includes('Error') || message.includes('Please') ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-700 border border-green-100'
                }`}>
                {message}
                </div>
            )}
            
            {isTailoringQuestions && (
                <div className="mb-6 bg-purple-50 text-purple-700 px-4 py-2 rounded-lg flex items-center text-sm font-bold animate-pulse">
                    <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Tailoring questions to your role...
                </div>
            )}

            {/* TEXT INPUT */}
            {inputMode === "text" && (
                <div className="w-full max-w-3xl space-y-6 animate-fade-in-up">
                {activeQuestions.map((q, i) => (
                    <div key={i} className="bg-white p-6 rounded-3xl shadow-lg border border-gray-100 text-left hover:border-purple-200 transition-colors"> 
                    <QuestionWithTooltip q={q} index={i} />
                    <textarea
                        className="w-full p-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all outline-none bg-gray-50 focus:bg-white resize-y min-h-[120px]"
                        onChange={(e) => setAnswers(prev => ({...prev, [i]: e.target.value}))}
                        value={answers[i] || ''}
                        placeholder="Type your answer here..."
                    />
                    </div>
                ))}
                </div>
            )}

            {/* AUDIO INPUT */}
            {inputMode === "audio" && (
                <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in-up items-start">
                    
                    {/* Guide Questions Panel */}
                    <div className="bg-white p-6 rounded-3xl shadow-lg border border-gray-100 text-left order-2 md:order-1 h-full md:max-h-[600px] overflow-y-auto custom-scrollbar">
                        <h3 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2 sticky top-0 bg-white pb-2 border-b border-gray-100 z-10">
                            Conversation Guide
                        </h3>
                        <div className="space-y-4">
                            {activeQuestions.map((q, i) => (
                                <div key={i} className="p-4 bg-purple-50 rounded-2xl border border-purple-100 text-sm text-gray-800 leading-relaxed shadow-sm">
                                    <span className="font-bold text-purple-400 mr-2 block mb-1">Q{i+1}.</span>
                                    <QuestionWithTooltip 
                                        q={q} 
                                        index={i} 
                                        transcription={transcriptionMap[q.id]}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Recorder Panel */}
                    <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 flex flex-col items-center justify-center min-h-[350px] order-1 md:order-2 sticky top-4">
                        <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 transition-all duration-500 ${isRecording ? 'bg-red-50 animate-pulse' : 'bg-cyan-50'}`}>
                            <div className={`w-12 h-12 rounded-full ${isRecording ? 'bg-red-500' : 'bg-cyan-500'} transition-colors duration-300`}></div>
                        </div>
                        
                        <p className="font-bold text-gray-900 text-xl mb-2">{isRecording ? 'Recording...' : 'Voice Recorder'}</p>
                        <p className="text-gray-500 mb-8 max-w-xs text-center text-sm">
                        {isRecording 
                            ? "Answer the guide questions on the left. Hover over the info icons for context." 
                            : "Press start and answer the questions at your own pace."}
                        </p>
                        
                        <div className="flex flex-col gap-3 w-full max-w-xs">
                            <button
                            onClick={isRecording ? stopRecording : startRecording}
                            className={`px-8 py-4 rounded-full font-bold text-white shadow-lg transform hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2 ${
                                isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-cyan-500 hover:bg-cyan-600'
                            }`}
                            >
                            {isRecording ? 'Stop Recording' : 'Start Recording'}
                            </button>
                            
                            {/* Transcribe Button */}
                            {audioUrl && !isRecording && (
                                <button
                                    onClick={handleTranscribe}
                                    disabled={isTranscribing}
                                    className="px-8 py-3 rounded-full font-bold text-cyan-600 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isTranscribing ? (
                                        <span className="animate-pulse">Analyzing...</span>
                                    ) : (
                                        <>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7 2a1 1 0 011 1v1h3a1 1 0 110 2H9.578a18.89 18.89 0 01-2.448-3.38A1 1 0 017 2zm4.51 10.51a9.95 9.95 0 00-3.363-3.363l-.447-.447 1.414-1.414.447.447a7.95 7.95 0 012.828 2.829l-.88 1.948z" clipRule="evenodd" /></svg>
                                            Transcribe & Analyze
                                        </>
                                    )}
                                </button>
                            )}
                        </div>

                        {audioUrl && (
                        <div className="mt-8 w-full">
                            <audio controls src={audioUrl} className="w-full rounded-lg" />
                        </div>
                        )}
                    </div>
                </div>
            )}

            {/* GENERATE ACTIONS */}
            {inputMode && (
                <div className="mt-8 w-full max-w-md space-y-3">
                    <button
                        onClick={() => handleGenerate(true)}
                        disabled={isGenerating}
                        className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold shadow-xl hover:shadow-2xl hover:opacity-95 transition-all duration-300 transform hover:scale-[1.01] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isGenerating ? (
                            <span className="animate-pulse">Generating with AI...</span>
                        ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" /></svg>
                                Generate Smart Draft (AI)
                            </>
                        )}
                    </button>
                    
                    <button
                        onClick={() => handleGenerate(false)}
                        disabled={isGenerating}
                        className="w-full py-3 rounded-2xl bg-white text-gray-600 font-bold border border-gray-200 hover:bg-gray-50 transition-all duration-200 text-sm"
                    >
                        Use Basic Template (No AI)
                    </button>
                </div>
            )}

            {/* PREVIEW & HISTORY */}
            {letter && (
                <div className="w-full mt-12 grid grid-cols-1 lg:grid-cols-4 gap-6 items-start max-w-6xl">
                    
                    {/* Main Draft Area */}
                    <div className="lg:col-span-3 bg-white p-8 rounded-3xl shadow-2xl border-2 border-purple-100 text-left animate-fade-in-up">
                        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-3">
                            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                Final Draft
                            </h2>
                            <div className="flex gap-2">
                                <a 
                                    href="https://chatgpt.com/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm font-bold text-green-600 bg-green-50 hover:bg-green-100 px-4 py-2 rounded-lg transition-colors flex items-center gap-1"
                                >
                                    Refine with ChatGPT ↗
                                </a>
                                <button 
                                    onClick={handleDownload}
                                    className="text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg transition-colors flex items-center gap-1"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                    Download
                                </button>
                                <button 
                                    onClick={() => {navigator.clipboard.writeText(letter); setMessage("Copied to clipboard!");}}
                                    className="text-sm font-bold text-purple-600 bg-purple-50 hover:bg-purple-100 px-4 py-2 rounded-lg transition-colors"
                                >
                                    Copy Text
                                </button>
                            </div>
                        </div>
                        <textarea
                            value={letter}
                            onChange={(e) => setLetter(e.target.value)}
                            className="w-full h-[600px] p-6 rounded-xl border border-gray-200 text-base font-serif leading-relaxed focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all outline-none resize-none shadow-inner bg-gray-50"
                        />
                        <div className="mt-4 flex justify-end">
                            <button
                                onClick={() => saveDraft(letter, "Manual Edit")}
                                className="text-sm text-gray-500 hover:text-purple-600 font-semibold underline decoration-dotted"
                            >
                                Save current edits as new draft
                            </button>
                        </div>
                    </div>

                    {/* Draft History Sidebar */}
                    <div className="lg:col-span-1 bg-white p-6 rounded-3xl shadow-lg border border-gray-100 h-full max-h-[700px] overflow-y-auto">
                        <h3 className="font-bold text-gray-900 mb-4 border-b pb-2">Draft History</h3>
                        {savedDrafts.length === 0 ? (
                            <p className="text-gray-400 text-sm italic">No saved drafts yet.</p>
                        ) : (
                            <div className="space-y-3">
                                {savedDrafts.map((draft) => (
                                    <button
                                        key={draft.id}
                                        onClick={() => restoreDraft(draft)}
                                        className="w-full text-left p-3 rounded-xl border hover:border-purple-300 hover:bg-purple-50 transition-all group"
                                    >
                                        <p className="font-bold text-gray-800 text-sm">{draft.label}</p>
                                        <p className="text-xs text-gray-500">{draft.timestamp}</p>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            <button
                onClick={() => setAppMode("select")} 
                className="mt-12 text-gray-400 font-bold hover:text-gray-800 flex items-center transition duration-200"
            >
                ← Start Over
            </button>
        </>
      )}
    </div>
  );
};

export default RecommenderTool;
