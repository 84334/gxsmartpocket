// Personalized Spending Rulebook — derives essential vs non-essential
// from the user's onboarding answers (primary transport + non-negotiables).

export type Rulebook = {
  primaryTransport?: string | null;
  nonNegotiables?: string[] | null;
};

export const TRANSPORT_OPTIONS = [
  "LRT/MRT",
  "Bus",
  "Grab/E-hailing",
  "Own vehicle",
  "Motorbike",
  "Walk/Bicycle",
] as const;

export const NON_NEGOTIABLE_SUGGESTIONS = [
  "Coffee",
  "Bubble tea",
  "Gym",
  "Streaming",
  "Cigarettes",
  "Snacks",
  "Eating out",
] as const;

const TRANSPORT_KEYWORDS: Record<string, string[]> = {
  "LRT/MRT": ["lrt", "mrt", "ktm", "monorail", "rapid", "touch n go", "tng"],
  "Bus": ["bus", "rapidkl", "rapid bus"],
  "Grab/E-hailing": ["grab", "airasia ride", "indrive", "mycar", "uber"],
  "Own vehicle": ["petrol", "petronas", "shell", "caltex", "bhp", "parking", "toll", "smarttag"],
  "Motorbike": ["petrol", "shell", "petronas"],
  "Walk/Bicycle": [],
};

function normalize(s: string) {
  return s.toLowerCase().trim();
}

/**
 * Apply the rulebook to a single AI-parsed item. Returns the corrected
 * is_essential flag. Logic:
 *   - Transport items only count as essential if they match the user's
 *     declared primary transport mode. Other transport = luxury.
 *   - Items matching a "non-negotiable" keyword stay essential even when
 *     the AI flagged them as a treat (user explicitly accepted them).
 *   - Otherwise we trust the AI's original flag.
 */
export function applyRulebook(
  item: { name: string; category: string; is_essential: boolean },
  rb: Rulebook,
): boolean {
  const name = normalize(item.name);

  if (rb.nonNegotiables?.some(n => name.includes(normalize(n)))) {
    return true;
  }

  if (item.category === "Transport") {
    const primary = rb.primaryTransport;
    if (!primary) return item.is_essential;
    const keywords = TRANSPORT_KEYWORDS[primary] ?? [];
    const matchesPrimary = keywords.some(k => name.includes(k));
    // If we can clearly tell it's a different transport mode, flag as luxury.
    const otherTransportMatch = Object.entries(TRANSPORT_KEYWORDS)
      .filter(([mode]) => mode !== primary)
      .some(([, kws]) => kws.some(k => name.includes(k)));
    if (matchesPrimary) return true;
    if (otherTransportMatch) return false;
    return item.is_essential;
  }

  return item.is_essential;
}

export function rulebookReason(
  item: { name: string; category: string },
  rb: Rulebook,
  flagged: boolean,
): string | null {
  const name = normalize(item.name);
  if (rb.nonNegotiables?.some(n => name.includes(normalize(n)))) {
    return "Matches your non-negotiables";
  }
  if (item.category === "Transport" && rb.primaryTransport) {
    const otherMatch = Object.entries(TRANSPORT_KEYWORDS)
      .filter(([mode]) => mode !== rb.primaryTransport)
      .some(([, kws]) => kws.some(k => name.includes(k)));
    if (otherMatch && !flagged) return `You picked ${rb.primaryTransport} — this is a luxury ride`;
  }
  return null;
}