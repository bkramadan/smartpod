/** Colours and spacing, matching the web dashboards and the deck. */
export const colors = {
  ink: '#0F2A2E',
  ink2: '#45555A',
  muted: '#6B7B7E',
  line: '#D5DEDC',
  bg: '#F6F5F0',
  card: '#FDFDFB',
  teal: '#1F7A6D',
  tealSoft: '#D6EAE5',
  mint: '#EAF0EE',
  good: '#1F7A6D',
  goodBg: '#DCEFE9',
  warn: '#9A5A12',
  warnBg: '#FBECD6',
  bad: '#B3401F',
  badBg: '#F8E1D8',
  white: '#FFFFFF',
};

export const space = (n: number) => n * 4;

export const time = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export const ago = (iso: string) => {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  if (mins < 24 * 60) return `${Math.round(mins / 60)} h ago`;
  return `${Math.round(mins / 1440)} d ago`;
};
