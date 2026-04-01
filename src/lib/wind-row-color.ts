/** Returns { bg, text } style for a table row based on wind speed in knots.
 *  @param threshold – minimum knots before colouring starts (default 10) */
export function windRowStyle(knots: number, threshold = 10): { backgroundColor?: string; color?: string } {
  if (knots < threshold) return {};
  const over = knots - threshold;
  // 0-5 above threshold: light yellow
  if (over < 5) return { backgroundColor: 'rgba(255,204,0,0.15)', color: undefined };
  // 5-10: yellow
  if (over < 10) return { backgroundColor: 'rgba(255,180,0,0.25)', color: undefined };
  // 10-15: orange
  if (over < 15) return { backgroundColor: 'rgba(255,140,0,0.35)', color: '#1a1a1a' };
  // 15-20: dark orange
  if (over < 20) return { backgroundColor: 'rgba(255,100,0,0.5)', color: '#111' };
  // 20-30: red-orange
  if (over < 30) return { backgroundColor: 'rgba(255,60,0,0.6)', color: '#fff' };
  // 30+: red
  return { backgroundColor: 'rgba(220,20,20,0.7)', color: '#fff' };
}
