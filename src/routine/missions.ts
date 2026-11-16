/**
 * Small self-improvement missions JARVIS can give you, to save time and build good habits.
 * These are life missions (do a thing now). The phone app has its own app-unlock missions.
 * Add your own lines here.
 */
export const MISSIONS: readonly string[] = [
  "Do 20 push-ups.",
  "Drink a glass of water.",
  "Read 5 pages of a book.",
  "Study or code for 25 minutes with no phone.",
  "Walk for 10 minutes.",
  "Tidy your desk for 5 minutes.",
  "Write down 3 things you are thankful for.",
  "Stretch for 3 minutes.",
  "Plan the one most important task for today.",
  "Take a 2-minute break and look far away to rest your eyes.",
];

/** Pick one mission. Pass a number 0..1 (default random) so tests can be sure of the result. */
export function pickMission(r: number = Math.random()): string {
  const i = Math.min(MISSIONS.length - 1, Math.max(0, Math.floor(r * MISSIONS.length)));
  return MISSIONS[i];
}
