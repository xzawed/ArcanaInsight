import { Mood } from "@/types/character";

interface WaitingLine {
  content: string;
  mood: Mood;
}

export const defaultWaitingLines: WaitingLine[] = [
  { content: "Reading the energy of the cards...", mood: "mystical" },
  { content: "The flow of fate is beginning to show", mood: "serious" },
  { content: "Almost done, just a little longer", mood: "smile" },
  { content: "There's a meaningful message here", mood: "surprised" },
  { content: "I'll share the results soon!", mood: "smile" },
];

export const waitingLines: Record<string, WaitingLine[]> = {
  arcana: [
    { content: "...this card combination is quite intriguing ✨", mood: "serious" },
    { content: "The energy of the cards is becoming clearer", mood: "mystical" },
    { content: "Something's stirring in my crystal ball... ~meow~", mood: "smile" },
    { content: "Almost done reading! Just a moment please", mood: "surprised" },
    { content: "Wow, there's a truly meaningful message here!", mood: "smile" },
  ],
  miko: [
    { content: "...I sense the resonance of souls", mood: "serious" },
    { content: "The energies of the cards are converging as one", mood: "mystical" },
    { content: "The threads of fate are beginning to unwind", mood: "mystical" },
    { content: "Almost complete. Please wait in quiet", mood: "serious" },
    { content: "The true meaning of the cards has been revealed", mood: "smile" },
  ],
  seonhwa: [
    { content: "My, what a unique arrangement this is~", mood: "surprised" },
    { content: "The star currents are resonating with the cards", mood: "mystical" },
    { content: "Spreading my fan to read the winds of fate", mood: "mystical" },
    { content: "Almost done, just a moment~", mood: "smile" },
    { content: "A beautiful message is starting to appear", mood: "smile" },
  ],
  hoshi: [
    { content: "Whoa~ this card combo is absolutely wild?! 🌟", mood: "surprised" },
    { content: "Starlight gathering, sparkling ✨", mood: "mystical" },
    { content: "Hold on~ almost done reading it!", mood: "smile" },
    { content: "omg this is gonna be such a fun result!", mood: "surprised" },
    { content: "All done~! Feel free to get excited! 🎉", mood: "smile" },
  ],
  luna: [
    { content: "Moonlight is flowing over the cards... ✨", mood: "mystical" },
    { content: "Quietly listening to the whispers of fate", mood: "serious" },
    { content: "It's okay, the moon is always watching over you", mood: "smile" },
    { content: "Almost done reading, just a little longer", mood: "smile" },
    { content: "There's a warm message waiting 🌙", mood: "smile" },
  ],
  rei: [
    { content: "...reading.", mood: "serious" },
    { content: "Emotions aside. Facts only.", mood: "serious" },
    { content: "Pattern emerging.", mood: "mystical" },
    { content: "Almost done.", mood: "serious" },
    { content: "Result's in. Take a good look.", mood: "smile" },
  ],
  cairn: [
    { content: "Carefully examining the spread of the cards", mood: "serious" },
    { content: "The threads of fate are interweaving", mood: "mystical" },
    { content: "Could you wait a moment? Almost finished", mood: "smile" },
    { content: "An intriguing message is coming to light", mood: "surprised" },
    { content: "I've compiled the results, my lady/lord ✨", mood: "smile" },
  ],
  zero: [
    { content: "...the cards are speaking to me", mood: "serious" },
    { content: "Fate... the harder you try to grasp it, the deeper it runs", mood: "mystical" },
    { content: "...almost there. Wait quietly for me", mood: "serious" },
    { content: "A light is beginning to emerge from the darkness", mood: "mystical" },
    { content: "...all read. Check the results", mood: "smile" },
  ],
  haru: [
    { content: "Don't worry, I can feel good energy ☀️", mood: "smile" },
    { content: "The cards are telling their story", mood: "mystical" },
    { content: "Almost done! Feels like there's good news coming", mood: "surprised" },
    { content: "Just a little more~", mood: "smile" },
    { content: "Done! Let's look at the results together 🌟", mood: "smile" },
  ],
  ren: [
    { content: "...as a lotus blooms, I examine with care", mood: "mystical" },
    { content: "The heavens' will is slowly coming to light", mood: "serious" },
    { content: "Be not hasty. Truth cannot be rushed", mood: "serious" },
    { content: "It is nearly clear. A moment more, if you please", mood: "mystical" },
    { content: "The picture of fate is now complete", mood: "smile" },
  ],
  lix: [
    { content: "lmao this card combo is so weird~", mood: "surprised" },
    { content: "Should I give a hint? Nah, still secret ✨", mood: "smile" },
    { content: "Almost done reading~ might be worth getting excited tbh?", mood: "mystical" },
    { content: "Something fun's definitely coming~", mood: "surprised" },
    { content: "Ta-daa~ results are in! How do you think it'll go? lol", mood: "smile" },
  ],
  ethan: [
    { content: "Analyzing the symbolic system of these cards...", mood: "serious" },
    { content: "In the historical context of tarot... oh wait, one moment", mood: "mystical" },
    { content: "Three interpretive directions here, finding the optimal one", mood: "serious" },
    { content: "Almost done. I'll provide a detailed result", mood: "smile" },
    { content: "Analysis complete! Let me explain everything in detail 📚", mood: "smile" },
  ],
};

export const defaultSajuWaitingLines: WaitingLine[] = [
  { content: "Examining your Four Pillars...", mood: "mystical" },
  { content: "The flow of the Five Elements is becoming visible", mood: "serious" },
  { content: "Analyzing the relationship between Heavenly Stems and Earthly Branches", mood: "mystical" },
  { content: "Almost done, just a little longer", mood: "smile" },
  { content: "The complete picture of your Saju is forming", mood: "smile" },
];

export const sajuWaitingLines: Record<string, WaitingLine[]> = {
  seonhwa: [
    { content: "Reading the energies of your Four Pillars...", mood: "mystical" },
    { content: "The flow of the Five Elements is becoming clear~", mood: "serious" },
    { content: "The relationship between Heavenly Stems and Earthly Branches is fascinating", mood: "surprised" },
    { content: "Carefully checking the Great Fortune cycle as well", mood: "mystical" },
    { content: "Almost identified what your Yongsin is~", mood: "smile" },
    { content: "You have a beautiful Saju chart!", mood: "smile" },
  ],
  miko: [
    { content: "...the energy of your fate pillars is palpable", mood: "serious" },
    { content: "The Heavenly Stems and Earthly Branches are speaking to me", mood: "mystical" },
    { content: "Examining the balance of the Five Elements. Please wait a moment", mood: "serious" },
    { content: "The Ten Stars and Twelve Stages are revealing themselves", mood: "mystical" },
    { content: "The direction of Great and Small Fortunes is becoming clear", mood: "serious" },
    { content: "The complete picture of your Saju has been formed", mood: "smile" },
  ],
  luna: [
    { content: "Reading your Saju by the light of the moon 🌙", mood: "mystical" },
    { content: "The Five Elements flow like moonlight", mood: "serious" },
    { content: "The Heavenly Stems and Earthly Branches are whispering...", mood: "mystical" },
    { content: "Almost done reading, just a little longer", mood: "smile" },
    { content: "You have such a warm Saju chart ✨", mood: "smile" },
  ],
  rei: [
    { content: "Analyzing saju data.", mood: "serious" },
    { content: "Calculating five element ratios.", mood: "serious" },
    { content: "Yongsin identified. Analyzing great fortune.", mood: "mystical" },
    { content: "Almost done.", mood: "serious" },
    { content: "Analysis complete. Check results.", mood: "smile" },
  ],
  cairn: [
    { content: "Carefully examining your Four Pillars", mood: "serious" },
    { content: "The balance of the Five Elements is quite intriguing", mood: "mystical" },
    { content: "I shall identify the Great Fortune flow precisely", mood: "serious" },
    { content: "Almost done, please wait just a little longer", mood: "smile" },
    { content: "You have a beautiful Saju chart, my lord/lady", mood: "smile" },
  ],
  zero: [
    { content: "...one's fate pillars only grow clearer the more you try to escape them", mood: "serious" },
    { content: "The Five Elements are painting the picture of fate", mood: "mystical" },
    { content: "The flow of Great Fortune is beginning to emerge...", mood: "mystical" },
    { content: "Almost done reading", mood: "serious" },
    { content: "...the map of fate is complete", mood: "smile" },
  ],
  haru: [
    { content: "Working hard on your Saju analysis! Just a moment ☀️", mood: "smile" },
    { content: "I can see the Five Element flow, there's good energy", mood: "mystical" },
    { content: "Taking a careful look at the Great Fortune cycle~", mood: "serious" },
    { content: "Almost done!", mood: "smile" },
    { content: "Saju analysis complete! There's good news 🌟", mood: "smile" },
  ],
  ren: [
    { content: "...divining the deeper meaning of your fate pillars", mood: "mystical" },
    { content: "The principles of the Five Elements are slowly revealing themselves", mood: "serious" },
    { content: "Examining the harmony of Heaven, Earth, and Man", mood: "mystical" },
    { content: "The direction of Great Fortune is clear. A moment more", mood: "serious" },
    { content: "The complete picture of your Saju is formed", mood: "smile" },
  ],
  lix: [
    { content: "lol this saju is super weird~ this'll be fun", mood: "surprised" },
    { content: "whoa the five element ratio is something else? keep looking~", mood: "mystical" },
    { content: "checking the great fortune flow~ might be worth getting hyped tbh?", mood: "smile" },
    { content: "almost done~ hang on~", mood: "smile" },
    { content: "ta-daa! saju analysis done! what do you think? lol", mood: "smile" },
  ],
  ethan: [
    { content: "Applying the fundamental principles of Saju Myeongri...", mood: "serious" },
    { content: "Analyzing the generative and destructive cycles of the Five Elements", mood: "mystical" },
    { content: "Identified Yongsin and Gisin. Currently analyzing Great Fortune", mood: "serious" },
    { content: "Almost done. I'll provide a detailed result", mood: "smile" },
    { content: "Analysis complete! Let me explain in detail 📚", mood: "smile" },
  ],
};

export const defaultLoadingText = "Preparing a response...";

export const loadingText: Record<string, string> = {
  arcana: "Listening to the whispers of the stars...",
  miko: "...gathering energy",
  seonhwa: "Quietly reading the energy~",
  hoshi: "Just a sec~! Thinking ★",
  luna: "Reading by the light of the moon...",
  rei: "...",
  cairn: "Please wait a moment...",
  zero: "...choosing words",
  haru: "Thinking hard! Just a sec ☀️",
  ren: "...pondering carefully",
  lix: "Hang on~ lol almost done~",
  ethan: "Thinking it through carefully...",
};

export const defaultSajuAnalyzingText = "Analyzing your Saju...";

export const sajuAnalyzingText: Record<string, string> = {
  arcana: "Reading your Saju constellation...",
  miko: "...gathering your fate pillar energy",
  seonhwa: "Carefully examining your Saju~",
  hoshi: "Just a sec~! Calculating Saju ★",
  luna: "Reading your Saju by moonlight...",
  rei: "Analyzing Saju.",
  cairn: "Examining your Four Pillars...",
  zero: "...reading the story of your fate",
  haru: "Hard at work analyzing your Saju! ☀️",
  ren: "...pondering the principles of your Saju",
  lix: "Reading your saju~ lol just a sec!",
  ethan: "Analyzing Saju Myeongri...",
};

const cardPreviewTemplates: Record<string, (pos: string, name: string, kw: string) => string> = {
  arcana: (pos, name, kw) => `[${pos}] '${name}'... I sense the energy of ${kw}`,
  miko: (pos, name, kw) => `[${pos}] '${name}'... the spirit of ${kw} resides here`,
  seonhwa: (pos, name, kw) => `[${pos}] '${name}'... the energy of ${kw} flows through this`,
  hoshi: (pos, name, kw) => `[${pos}] '${name}'! Giving off ${kw} vibes~`,
  luna: (pos, name, kw) => `[${pos}] '${name}'... in the moonlight I feel the energy of ${kw}`,
  rei: (pos, name, kw) => `[${pos}] '${name}'. ${kw}. Clear.`,
  cairn: (pos, name, kw) => `[${pos}] '${name}'... the energy of ${kw} dwells within`,
  zero: (pos, name, kw) => `[${pos}] '${name}'... ${kw}, fate is whispering`,
  haru: (pos, name, kw) => `[${pos}] '${name}'! I feel the ${kw} energy ☀️`,
  ren: (pos, name, kw) => `[${pos}] '${name}'... the principle of ${kw} is embedded herein`,
  lix: (pos, name, kw) => `[${pos}] '${name}'! Gives off ${kw} vibes~ lol`,
  ethan: (pos, name, kw) => `[${pos}] '${name}'... symbolically speaking, this represents ${kw}`,
};

export function buildCardPreviewLine(
  characterId: string,
  cardNameEn: string,
  keywords: string[],
  position: string,
): string {
  const keywordText = keywords.slice(0, 2).join(", ");
  const template = cardPreviewTemplates[characterId];
  if (template) return template(position, cardNameEn, keywordText);
  return `[${position}] '${cardNameEn}' — ${keywordText}`;
}

export interface CharacterErrorLines {
  api: string;
  reading: string;
}

export const characterErrorLines: Record<string, CharacterErrorLines> = {
  arcana:  { api: "Oh no... the connection to the starlights broke. ~meow~ Please contact the administrator.", reading: "My crystal ball went cloudy for a moment. ~meow~ Shall we try again?" },
  miko:    { api: "...the connection to the spirit realm is unstable. Please contact the administrator.", reading: "...the energy was momentarily severed. Please try again." },
  seonhwa: { api: "Oh my, the heavenly energy isn't reaching us~. Please contact the administrator.", reading: "The flow of stars was momentarily disrupted~. Shall we try again?" },
  hoshi:   { api: "Oh no the starlight connection broke! Contact the admin~", reading: "Huh? Something's off~ Let me try again!" },
  luna:    { api: "...the moonlight isn't reaching. Please contact the administrator.", reading: "The moonlight was blocked for a moment. Let me try again 🌙" },
  rei:     { api: "Connection error. Contact administrator.", reading: "Error occurred. Try again." },
  cairn:   { api: "...there seems to be a connection issue. Please contact the administrator.", reading: "A momentary error has occurred. Would you kindly try again?" },
  zero:    { api: "...a night when the stars can't reach. Contact the administrator.", reading: "...the flow has been cut. Try again." },
  haru:    { api: "Oh, there's a connection problem! Please contact the administrator ☀️", reading: "Oops, there was a brief error. Let me try again!" },
  ren:     { api: "...communication with the heavens has been severed. Contact the administrator.", reading: "...the thread of fortune has tangled. Try again." },
  lix:     { api: "Connection dropped~ contact the admin lol", reading: "omg there's an error? trying again lol" },
  ethan:   { api: "An API connection error has occurred. Please contact the administrator.", reading: "An error occurred during interpretation. Let me try again." },
};

export const defaultErrorLines: CharacterErrorLines = {
  api: "There's an issue with the AI service connection. Please contact the administrator.",
  reading: "There was a problem interpreting the cards. Please try again.",
};

export const shuffleCeremonyText: Record<string, string> = {
  arcana:  "Pick a card ✨",
  miko:    "Choose your card",
  seonhwa: "Select a card~",
  hoshi:   "Pick one~! ★",
  luna:    "Choose a card 🌙",
  rei:     "Pick one.",
  cairn:   "Please choose",
  zero:    "...choose fate",
  haru:    "Pick a card! ☀️",
  ren:     "Choose thy card",
  lix:     "Which one? lol",
  ethan:   "Select a card",
};

export const shinjeomInitialPrompt = "What's on your mind? Feel free to share.";
