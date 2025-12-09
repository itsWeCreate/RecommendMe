
import { ProgramContext, Question, RecommenderInfo } from "../types";

export const getTailoredQuestions = (context: ProgramContext): Question[] => {
  // Default fallback if no context exists
  if (!context || !context.coreQualities || context.coreQualities.every(q => q === "")) {
    return [
        { id: '1', text: "How long and in what capacity have you known the applicant?", focusQuality: "Relationship", contextContext: "General context" },
        { id: '2', text: "Describe a specific, compelling example of the applicant's work ethic.", focusQuality: "Work Ethic", contextContext: "General observation" },
        { id: '3', text: "Why do you recommend them for this opportunity?", focusQuality: "Endorsement", contextContext: "Overall recommendation" }
    ];
  }

  const qualities = context.coreQualities.filter(q => q.trim() !== "");
  const tailored: Question[] = [];

  // 1. Relationship
  tailored.push({
      id: 'rel',
      text: "How long and in what capacity have you known the applicant, and in what setting did you observe their skills most directly?",
      focusQuality: "Context & Relationship",
      contextContext: "Establish credibility of the recommendation."
  });

  // 2. Focused Anecdotes
  qualities.forEach((quality, index) => {
    const anecdote = context.specificAnecdotes[index] || "General demonstration of this quality.";
    
    let qText = `Please describe a specific, meaningful instance where the applicant demonstrated ${quality}.`;
    
    // Improved template logic (fallback if AI isn't used)
    if (context.specificAnecdotes[index] && context.specificAnecdotes[index].trim().length > 0) {
         qText = `The applicant mentions experience with: "${anecdote}". Can you elaborate on your observation of their ${quality} in this or a similar context?`;
    }

    tailored.push({
        id: `qual-${index}`,
        text: qText,
        focusQuality: quality,
        contextContext: anecdote
    });
  });
  
  // 3. Program Fit
  if (context.opportunityContext && context.opportunityContext.trim().length > 0) {
      tailored.push({
          id: 'fit',
          text: `Considering the opportunity involves "${context.opportunityContext}", how has the applicant demonstrated they are ready for this specific challenge?`,
          focusQuality: "Fit for Opportunity",
          contextContext: context.opportunityContext
      });
  }

  // 4. Closing
  tailored.push({
      id: 'close',
      text: "Why do you give the applicant your strongest, most enthusiastic recommendation for future success?",
      focusQuality: "Final Endorsement",
      contextContext: "Summary of potential."
  });

  return tailored;
};

export const generateTemplateLetter = (
  context: ProgramContext, 
  answers: Record<string, string>, 
  questions: Question[],
  recommenderInfo?: RecommenderInfo
): string => {
  
  const relString = recommenderInfo 
    ? `${recommenderInfo.relationship}${recommenderInfo.otherRelationship ? ` (${recommenderInfo.otherRelationship})` : ''}` 
    : '[Relationship]';

  const companyString = recommenderInfo?.company ? ` at ${recommenderInfo.company}` : '';

  const contextLines = [
    `[Date]`,
    `To the Admissions Committee of ${context.targetProgramName || 'the Opportunity'}`,
    `Re: Recommendation for ${context.applicantName}`,
    `Deadline: ${context.submissionDeadline || 'N/A'}`,
    `---`,
    `It is with immense pleasure that I recommend ${context.applicantName} for the ${context.targetProgramName}.`,
    `I am the ${recommenderInfo?.title || '[Title]'}${companyString} and have known ${context.applicantName} as their ${relString}.`,
  ];

  const answerLines = Object.entries(answers)
    .filter(([, answer]) => answer && answer.trim() !== '')
    .map(([index, answer]) => {
      // Find the question object to get the header
      const questionObj = questions[parseInt(index, 10)];
      const header = questionObj ? questionObj.focusQuality : 'General Assessment';
      
      return `\n\n**${header}:**\n${answer}`;
    });

  const closing = [
    "\n\nBased on the demonstrated excellence and clear potential for leadership/scholarship (as detailed above), I give my strongest possible endorsement.",
    "I am confident that they will not only succeed but will profoundly contribute to your program. Please feel free to contact me with any further questions.",
    "\nSincerely,",
    recommenderInfo?.name || "[Recommender Name]",
    recommenderInfo?.title || "[Title]",
    recommenderInfo?.company || "[Organization/Company]"
  ];

  return contextLines.join("\n") + answerLines.join("") + closing.join("\n");
};
