/** Returns { bg, text } style for a table row based on wind speed in knots */
export function windRowStyle(knots: number): { backgroundColor?: string; color?: string } {
  if (knots < 10) return {};
  // 10-15 kn: light yellow
  if (knots < 15) return { backgroundColor: 'rgba(255,204,0,0.15)', color: undefined };
  // 15-20 kn: yellow
  if (knots < 20) return { backgroundColor: 'rgba(255,180,0,0.25)', color: undefined };
  // 20-25 kn: orange
  if (knots < 25) return { backgroundColor: 'rgba(255,140,0,0.35)', color: '#1a1a1a' };
  // 25-30 kn: dark orange
  if (knots < 30) return { backgroundColor: 'rgba(255,100,0,0.5)', color: '#111' };
  // 30-40 kn: red-orange
  if (knots < 40) return { backgroundColor: 'rgba(255,60,0,0.6)', color: '#fff' };
  // 40+ kn: red
  return { backgroundColor: 'rgba(220,20,20,0.7)', color: '#fff' };
}
