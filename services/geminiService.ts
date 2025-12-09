
import { GoogleGenAI } from "@google/genai";
import { ProgramContext, RecommenderInfo, Question } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64data = reader.result as string;
      // Remove data url prefix (e.g., "data:audio/webm;base64,")
      const base64Content = base64data.split(',')[1];
      resolve(base64Content);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export const generateLetterWithGemini = async (
  context: ProgramContext,
  answers: Record<string, string>,
  audioBlob: Blob | null,
  recommenderInfo?: RecommenderInfo
): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("Missing API Key");
  }

  const model = "gemini-2.5-flash"; 
  const parts: any[] = [];

  const companyString = recommenderInfo?.company ? ` at ${recommenderInfo.company}` : '';
  const relString = recommenderInfo 
    ? `My name is ${recommenderInfo.name}, and I am the ${recommenderInfo.title}${companyString}. My relationship to the applicant is: ${recommenderInfo.relationship} ${recommenderInfo.otherRelationship ? `(${recommenderInfo.otherRelationship})` : ''}.` 
    : "I am a recommender for the applicant.";

  // System context prompt
  let prompt = `You are an expert academic and professional letter writer. 
  Write a formal recommendation letter for ${context.applicantName} applying to ${context.targetProgramName}.
  The deadline is ${context.submissionDeadline}.
  
  RECOMMENDER INFO:
  ${relString}
  
  CONTEXT ABOUT THE OPPORTUNITY:
  "${context.opportunityContext}"
  
  Please format the letter professionally. Use the following context provided by the recommender to draft the content.
  `;

  // Add text answers if available
  if (Object.keys(answers).length > 0) {
    prompt += `\n\nHere are my written answers to specific questions:\n`;
    Object.entries(answers).forEach(([key, value]) => {
      prompt += `- ${value}\n`;
    });
  }

  // Add audio context if available
  if (audioBlob) {
    prompt += `\n\nI also recorded a voice memo with additional context. Please listen to the audio and incorporate the key positive traits and anecdotes mentioned into the letter.`;
    const audioBase64 = await blobToBase64(audioBlob);
    
    parts.push({
      inlineData: {
        mimeType: audioBlob.type || 'audio/webm',
        data: audioBase64
      }
    });
  }

  parts.push({ text: prompt });

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: { parts: parts },
      config: {
        systemInstruction: "You are a professional editor helping to draft a recommendation letter. Output ONLY the body of the letter. Ensure the tone matches the recommender's relationship.",
      }
    });

    return response.text || "Could not generate letter from AI.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Failed to generate letter with Gemini.");
  }
};

export const generateInterviewQuestions = async (
    context: ProgramContext, 
    recommenderInfo?: RecommenderInfo
): Promise<Question[]> => {
  if (!process.env.API_KEY) {
    throw new Error("Missing API Key");
  }

  const companyString = recommenderInfo?.company ? ` at ${recommenderInfo.company}` : '';
  const relationshipContext = recommenderInfo 
    ? `The interviewer is the applicant's ${recommenderInfo.relationship} (${recommenderInfo.title}${companyString}). Tailor the questions to be appropriate for this professional relationship.` 
    : "The interviewer is a professional recommender.";

  const prompt = `
    You are an expert investigative journalist and academic interviewer. 
    Your goal is to extract "WOW" stories from a recommender about the applicant, ${context.applicantName}, who is applying to ${context.targetProgramName}.
    
    CONTEXT:
    Program Context: "${context.opportunityContext}"
    ${relationshipContext}
    
    The applicant has provided the following "seeds" of stories (anecdotes) they want highlighted. Use these to generate specific questions.
    
    SEEDS:
    1. Quality: ${context.coreQualities[0]} -> Context: ${context.specificAnecdotes[0]}
    2. Quality: ${context.coreQualities[1]} -> Context: ${context.specificAnecdotes[1]}
    3. Quality: ${context.coreQualities[2]} -> Context: ${context.specificAnecdotes[2]}

    TASK:
    Generate 4 to 5 highly tailored, open-ended questions.
    
    STRICT RULES:
    1. Do NOT list the context in parentheses like "(Context provided by: ...)". This is forbidden.
    2. INTEGREATE the context naturally into the question preamble. 
       BAD: "Tell me about resilience. (Context: She failed a test)"
       GOOD: "The applicant mentioned overcoming a significant setback during their senior thesis. Can you share your perspective on how they handled that failure?"
    3. Ask for specific evidence of impact, leadership, or growth.
    4. Make the questions sound professional but conversational.
    5. Return a JSON array of objects.
    
    OUTPUT FORMAT (JSON ONLY):
    [
      {
        "id": "unique_id_1",
        "text": "The actual question string...",
        "focusQuality": "The core quality this addresses (e.g. Leadership)",
        "contextContext": "The specific anecdote or context provided by the applicant that triggered this question."
      }
    ]
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text;
    if (!text) return [];
    
    // Parse JSON
    return JSON.parse(text) as Question[];
  } catch (error) {
    console.error("Error generating questions:", error);
    throw error;
  }
};

export const transcribeAndAnalyzeAudio = async (
  audioBlob: Blob,
  questions: Question[]
): Promise<Record<string, string>> => {
  if (!process.env.API_KEY) {
    throw new Error("Missing API Key");
  }

  const audioBase64 = await blobToBase64(audioBlob);
  
  // Create a structured list of questions for the model
  const questionsList = questions.map(q => `ID: "${q.id}"\nQuestion: "${q.text}"`).join("\n\n");

  const prompt = `
    You are a professional transcription assistant. 
    Please listen to the attached audio recording of a recommendation letter interview.
    
    The speaker is answering the following specific questions:
    
    ${questionsList}
    
    TASK:
    1. Transcribe the audio.
    2. Map the transcribed answers to the corresponding Question IDs defined above.
    3. If the speaker answers multiple questions in one go, split the text accordingly.
    4. If a part of the audio is general context not specific to a question, map it to "general".
    
    OUTPUT FORMAT (JSON ONLY):
    {
       "question_id_1": "Verbatim transcription of the answer...",
       "question_id_2": "Verbatim transcription of the answer...",
       "general": "Any other context..."
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: audioBlob.type || 'audio/webm',
              data: audioBase64
            }
          },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text;
    if (!text) return {};
    return JSON.parse(text) as Record<string, string>;
  } catch (error) {
    console.error("Transcription error:", error);
    throw new Error("Failed to transcribe audio.");
  }
};
