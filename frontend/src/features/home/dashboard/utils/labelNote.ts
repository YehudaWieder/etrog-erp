const PAREN_NOTE_PATTERN = /^(.*?)\s*\(([^)]*)\)\s*$/;

export function splitLabelNote(label: string): { main: string; note: string | null } {
  const match = label.match(PAREN_NOTE_PATTERN);
  if (!match) return { main: label, note: null };
  return { main: match[1], note: match[2] };
}
