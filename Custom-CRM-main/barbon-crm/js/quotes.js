// Motivational lines framed from servitude and honour rather than hustle/ego.
// Sources: Alex Hormozi, Napoleon Hill, Stoicism, Christianity.
export const QUOTES = [
  { text: "Whatever you do, work at it with all your heart, as working for the Lord.", source: "Colossians 3:23", tag: "Christianity" },
  { text: "The most valuable skill you can learn is the ability to do hard things when you don't feel like it.", source: "Alex Hormozi", tag: "Hormozi" },
  { text: "Whatever the mind can conceive and believe, it can achieve.", source: "Napoleon Hill", tag: "Napoleon Hill" },
  { text: "You have power over your mind — not outside events. Realise this, and you will find strength.", source: "Marcus Aurelius", tag: "Stoicism" },
  { text: "Let each of you look not only to his own interests, but also to the interests of others.", source: "Philippians 2:4", tag: "Christianity" },
  { text: "The person who does more than they are paid for will soon be paid for more than they do.", source: "Napoleon Hill", tag: "Napoleon Hill" },
  { text: "Waste no more time arguing about what a good man should be. Be one.", source: "Marcus Aurelius", tag: "Stoicism" },
  { text: "Volume negates luck. Do enough reps and the odds bend toward you.", source: "Alex Hormozi", tag: "Hormozi" },
  { text: "Whoever wants to become great among you must be your servant.", source: "Mark 10:43", tag: "Christianity" },
  { text: "It is not the man who has too little, but the man who craves more, that is poor.", source: "Seneca", tag: "Stoicism" },
  { text: "Strength and growth come only through continuous effort and struggle.", source: "Napoleon Hill", tag: "Napoleon Hill" },
  { text: "The purpose of life is not to be happy. It is to be useful, honourable, to have it make some difference that you have lived and lived well.", source: "Ralph Waldo Emerson", tag: "Stoicism" },
  { text: "You are not entitled to the outcome, only the effort. Fall in love with the work itself.", source: "Alex Hormozi", tag: "Hormozi" },
  { text: "Commit to the Lord whatever you do, and He will establish your plans.", source: "Proverbs 16:3", tag: "Christianity" },
  { text: "First say to yourself what you would be; and then do what you have to do.", source: "Epictetus", tag: "Stoicism" },
  { text: "A goal is a dream with a deadline. Serve the work today.", source: "Napoleon Hill", tag: "Napoleon Hill" },
  { text: "The reward for work done well is more work — and the honour of being trusted with it.", source: "Proverbs 22:29 (paraphrase)", tag: "Christianity" },
  { text: "Concentrate every minute like a Roman — on doing what's in front of you with honest gravity.", source: "Marcus Aurelius", tag: "Stoicism" },
  { text: "Charm is the ability to make someone else feel good. Serve first, and selling takes care of itself.", source: "Alex Hormozi", tag: "Hormozi" },
  { text: "Do all the good you can, in all the ways you can, for as long as you ever can.", source: "John Wesley", tag: "Christianity" },
];

// Stable quote for a given day so the dashboard doesn't flicker on re-render.
export function quoteForDay(iso) {
  const s = String(iso || '');
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return QUOTES[Math.abs(h) % QUOTES.length];
}
