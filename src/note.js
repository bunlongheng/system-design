// A node note is plain text under the card: what this step does, why it is
// there, or what changes. Trimmed and bounded so a shared row stays small.
// '' means "no note" everywhere - the key is dropped rather than stored empty.
export const NOTE_MAX = 400
export const cleanNote = v => (typeof v === 'string' ? v.trim().slice(0, NOTE_MAX) : '')
