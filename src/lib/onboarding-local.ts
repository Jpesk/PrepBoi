/**
 * Client-Side Offline Heuristic Onboarding Parser and Quiz Generator
 * Provides 100% free, dependency-free fallbacks for quiz generation and onboarding path parsing.
 */

export interface SopSection {
  title: string;
  body: string;
}

export interface QuizQuestion {
  q: string;
  opts: string[];
  ans: number;
}

export interface ParsedPaths {
  theWhy: Array<{ title: string; explanation: string; shadowNotes: string; studyNotes: string }>;
  shortSweet: Array<{ title: string; bullets: string[]; soloAction: string }>;
  audible: { script: string; durationEst: number; speechText: string };
  handsOn: Array<{ title: string; checkPoints: string[]; coachCriteria: string }>;
}

// Helper to sanitize text
function cleanText(txt: string): string {
  return txt.replace(/[*#`_\-]/g, '').trim();
}

/**
 * 1. Rule-based local Quiz Generator
 */
export function generateLocalQuiz(title: string, sections: SopSection[]): QuizQuestion[] {
  const questions: QuizQuestion[] = [];
  const processedSections = sections.length > 0 ? sections : [{ title: "General Operations", body: `Follow standard procedures for ${title}.` }];

  processedSections.forEach((sec) => {
    const sTitle = cleanText(sec.title);
    const body = sec.body;

    // Rule A: Search for temperature patterns (e.g., 41°F, 140 degrees)
    const tempMatch = body.match(/(\d+)\s*(?:°F|degrees|Fahrenheit|C|°C)/i);
    if (tempMatch) {
      const val = tempMatch[1];
      const unit = body.includes('°C') || body.includes(' C') ? '°C' : '°F';
      questions.push({
        q: `In the context of "${sTitle}", what is the key temperature limit specified?`,
        opts: [
          `${val}${unit} (As specified)`,
          `${parseInt(val) + 15}${unit}`,
          `${parseInt(val) - 10}${unit}`,
          `Room temperature (around 70°F)`
        ],
        ans: 0
      });
      return;
    }

    // Rule B: Search for time intervals or numbers
    const timeMatch = body.match(/(\d+)\s*(?:minutes|mins|hours|hrs|seconds|secs|days)/i);
    if (timeMatch) {
      const duration = timeMatch[0];
      questions.push({
        q: `According to the guidelines for "${sTitle}", what duration or timing is required?`,
        opts: [
          `Exactly ${duration}`,
          `Double the time, or as needed`,
          `No specific time is required`,
          `Only during opening hours`
        ],
        ans: 0
      });
      return;
    }

    // Rule C: Look for bold definitions or quotes (e.g. "**Sanitizer**")
    const boldMatch = body.match(/\*\*([^*]+)\*\*/);
    if (boldMatch) {
      const keyword = boldMatch[1];
      questions.push({
        q: `What is the significance or use of "${keyword}" in "${sTitle}"?`,
        opts: [
          `It is a critical component/process mentioned in the guide`,
          `It is a completely optional recommendation`,
          `It should only be used by the Store Manager`,
          `It is deprecated and should be avoided`
        ],
        ans: 0
      });
      return;
    }

    // Rule D: Action-verb mapping (Sanitize, clean, check, inspect, verify)
    const verbs = ["sanitize", "clean", "verify", "inspect", "measure", "store", "discard", "wash"];
    for (const verb of verbs) {
      const regex = new RegExp(`(?:should|must|always|please)\\s+(${verb}\\s+[^.,;]+)`, 'i');
      const verbMatch = body.match(regex);
      if (verbMatch) {
        const action = verbMatch[1].toLowerCase();
        questions.push({
          q: `Which action represents a required practice in "${sTitle}"?`,
          opts: [
            `To ${action}`,
            `To ignore the step if in a rush`,
            `To delegate to an untrained team member`,
            `To execute only on weekend shifts`
          ],
          ans: 0
        });
        return;
      }
    }

    // Fallback: general understanding question
    questions.push({
      q: `What is the primary operational focus of the "${sTitle}" section?`,
      opts: [
        `Ensuring proper execution and compliance with ${title} standards`,
        `Filing administrative complaints to shift leaders`,
        `Leaving the task incomplete for the incoming shift`,
        `Minimizing the use of safety equipment`
      ],
      ans: 0
    });
  });

  // Guarantee at least 3 questions by augmenting if too short
  while (questions.length < 3) {
    const qIndex = questions.length;
    questions.push({
      q: `Regarding "${title}", which of the following best describes the core safety and efficiency objective?`,
      opts: [
        `Maintaining strict organization, hygiene, and white-labeled standard operations (Question ${qIndex + 1})`,
        `Speeding through steps to finish tasks under 1 minute without inspection`,
        `Excluding other team members from training discussions`,
        `Using custom settings without logging changes`
      ],
      ans: 0
    });
  }

  return questions;
}

/**
 * 2. Rule-based local SOP Onboarding Path Parser
 */
export function parseLocalPaths(title: string, sections: SopSection[]): ParsedPaths {
  const processedSections = sections.length > 0 ? sections : [{ title: "General Operations", body: `Follow standard procedures for ${title}.` }];

  // Path A: The Why (Logic-first long form)
  const theWhy = processedSections.map(sec => {
    const cleanTitle = cleanText(sec.title);
    return {
      title: cleanTitle,
      explanation: sec.body,
      shadowNotes: `Observe your trainer executing "${cleanTitle}". Ask them exactly why they prioritize these steps and notice their body posture and tool placement.`,
      studyNotes: `Read this section twice. Focus on understanding the cause-and-effect relationship between doing this task correctly and maintaining operational hygiene.`
    };
  });

  // Path B: Short & Sweet (Concise visual bullet points)
  const shortSweet = processedSections.map(sec => {
    const cleanTitle = cleanText(sec.title);
    // Find bullet lines or split by sentences and take first 3
    const sentences = sec.body.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 10);
    const bullets = sentences.slice(0, 3).map(s => s + ".");
    return {
      title: cleanTitle,
      bullets: bullets.length > 0 ? bullets : ["Perform the standard operation as described.", "Confirm safety measures."],
      soloAction: `Complete the "${cleanTitle}" tasks independently. Have a Shift Leader inspect your work to sign off.`
    };
  });

  // Path C: Audible (Script reading script + text-to-speech)
  let script = `Welcome to the Audible training course for ${title}. We will cover the ${processedSections.length} core sections. Let's begin.\n\n`;
  let speechText = `Welcome to the training course for ${title}. Let's begin. `;

  processedSections.forEach((sec, i) => {
    const cleanTitle = cleanText(sec.title);
    const bodyText = cleanText(sec.body);
    script += `[Section ${i + 1}: ${cleanTitle}]\n"${bodyText}"\n\n`;
    speechText += `Section ${i + 1}: ${cleanTitle}. ${bodyText}. `;
  });
  script += `This concludes the audible summary for ${title}. Make sure to complete your hands-on shadowing checklist next!`;
  speechText += " This concludes the audible summary. Good luck with your checklist!";

  const audible = {
    script,
    durationEst: Math.max(1, Math.round(speechText.split(/\s+/).length / 150)), // ~150 words per minute
    speechText
  };

  // Path D: Hands-On (Checksheet shadowing tool)
  const handsOn = processedSections.map(sec => {
    const cleanTitle = cleanText(sec.title);
    return {
      title: cleanTitle,
      checkPoints: [
        `Gather all required ingredients and tools for "${cleanTitle}"`,
        `Perform the initial setup and verify safety checkpoints`,
        `Demonstrate task execution under active coach supervision`,
        `Clean and sanitize workspace after task completion`
      ],
      coachCriteria: `Verify that the employee performs sanitization, uses correct tools, and completes the step within standard operational timing without safety hazards.`
    };
  });

  return {
    theWhy,
    shortSweet,
    audible,
    handsOn
  };
}

/**
 * Text-to-speech player utility
 */
export function playAudibleText(text: string, onBoundary?: (charIndex: number) => void, onEnd?: () => void): SpeechSynthesisUtterance | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  
  // Cancel active playback
  window.speechSynthesis.cancel();
  
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.95; // Slightly slower for training comprehension
  utterance.pitch = 1.0;
  
  if (onBoundary) {
    utterance.onboundary = (event) => {
      if (event.name === 'word') {
        onBoundary(event.charIndex);
      }
    };
  }
  
  if (onEnd) {
    utterance.onend = onEnd;
    utterance.onerror = onEnd;
  }
  
  window.speechSynthesis.speak(utterance);
  return utterance;
}

export function stopAudibleText() {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

/**
 * 3. Rule-based Recipe Quiz Generator
 */
export function generateRecipeQuiz(recipe: {
  title: string;
  yield_amount: number;
  yield_unit: string;
  prep_time?: string | null;
  bake_time?: string | null;
  temperature?: string | null;
  ingredients: Array<{ name: string; amount: number; unit: string }>;
  steps: string[];
}): QuizQuestion[] {
  const questions: QuizQuestion[] = [];

  // Question 1: Yield
  questions.push({
    q: `What is the standard yield for a single batch of ${recipe.title}?`,
    opts: [
      `${recipe.yield_amount} ${recipe.yield_unit}`,
      `${recipe.yield_amount * 2} ${recipe.yield_unit}`,
      `${Math.ceil(recipe.yield_amount / 2)} ${recipe.yield_unit}`,
      `1 portion`
    ],
    ans: 0
  });

  // Question 2: Ingredients quantities (pick up to 2 ingredients)
  if (recipe.ingredients && recipe.ingredients.length > 0) {
    const limit = Math.min(recipe.ingredients.length, 2);
    for (let i = 0; i < limit; i++) {
      const ing = recipe.ingredients[i];
      questions.push({
        q: `What quantity of "${ing.name}" is required for one batch of ${recipe.title}?`,
        opts: [
          `${ing.amount} ${ing.unit}`,
          `${ing.amount * 2} ${ing.unit}`,
          `${ing.amount / 2} ${ing.unit}`,
          `0 ${ing.unit} (Optional)`
        ],
        ans: 0
      });
    }
  }

  // Question 3: Bake time or Temp
  if (recipe.bake_time && recipe.bake_time !== 'N/A' && recipe.bake_time !== '0m') {
    questions.push({
      q: `What is the designated bake/cook time for ${recipe.title}?`,
      opts: [
        recipe.bake_time,
        `${parseInt(recipe.bake_time) + 10}m`,
        `${parseInt(recipe.bake_time) - 5}m`,
        `Until golden brown (no timer)`
      ],
      ans: 0
    });
  }

  if (recipe.temperature && recipe.temperature !== 'N/A') {
    questions.push({
      q: `What is the correct preparation/baking temperature for ${recipe.title}?`,
      opts: [
        recipe.temperature,
        `Room temperature`,
        `Chilled (below 41°F)`,
        `Boiling (212°F)`
      ],
      ans: 0
    });
  }

  // Question 4: Steps
  if (recipe.steps && recipe.steps.length > 0) {
    const firstStep = recipe.steps[0];
    questions.push({
      q: `According to the recipe guide, what is the very first step in preparing ${recipe.title}?`,
      opts: [
        firstStep,
        `Plate and garnish the finished dish.`,
        `Preheat the oven to maximum temperature.`,
        `Sanitize the hands and clean the prep table.`
      ],
      ans: 0
    });
  }

  // Fallback if not enough questions
  if (questions.length < 2) {
    questions.push({
      q: `True or False: Measurements for ${recipe.title} should be strictly weighed for consistency.`,
      opts: ["True", "False"],
      ans: 0
    });
  }

  return questions;
}

/**
 * 4. Rule-based Recipe Book Quiz Generator
 */
export function generateRecipeBookQuiz(
  bookTitle: string,
  recipes: Array<{
    title: string;
    yield_amount: number;
    yield_unit: string;
    ingredients: Array<{ name: string; amount: number; unit: string }>;
    steps: string[];
  }>
): QuizQuestion[] {
  const questions: QuizQuestion[] = [];
  
  if (recipes.length === 0) {
    return [{
      q: `True or False: Standard Operating Procedures require all recipes in the "${bookTitle}" book to be signed off.`,
      opts: ["True", "False"],
      ans: 0
    }];
  }

  // Take 2 questions per recipe up to 6 questions total
  recipes.forEach(recipe => {
    const recQuiz = generateRecipeQuiz(recipe);
    if (recQuiz.length > 0) {
      questions.push({
        ...recQuiz[0],
        q: `For recipe "${recipe.title}": ${recQuiz[0].q}`
      });
    }
    if (recQuiz.length > 1) {
      questions.push({
        ...recQuiz[1],
        q: `For recipe "${recipe.title}": ${recQuiz[1].q}`
      });
    }
  });

  return questions.slice(0, 6);
}

