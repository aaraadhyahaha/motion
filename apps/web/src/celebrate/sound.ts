// #anim optional completion chime: WebAudio synth (0 asset bytes), muted by default, per-device setting.
// The AudioContext is suspended after each note so no audio thread runs while idle.
const KEY = 'motion.sound';
let ac: AudioContext | undefined;

export const soundOn = () => localStorage.getItem(KEY) === '1';
export const setSound = (on: boolean) => (on ? localStorage.setItem(KEY, '1') : localStorage.removeItem(KEY));

export function chime(big: boolean) {
  ac ??= new AudioContext();
  void ac.resume();
  const t = ac.currentTime;
  const out = ac.createGain();
  out.gain.setValueAtTime(0.0001, t);
  out.gain.exponentialRampToValueAtTime(0.12, t + 0.01);
  out.gain.exponentialRampToValueAtTime(0.0001, t + (big ? 0.9 : 0.45));
  out.connect(ac.destination);
  const notes = big ? [784, 988, 1319] : [880, 1319];
  notes.forEach((f, i) => {
    const o = ac!.createOscillator();
    o.frequency.value = f;
    o.connect(out);
    o.start(t + i * 0.06);
    o.stop(t + (big ? 0.95 : 0.5));
    if (i === notes.length - 1) o.onended = () => void ac?.suspend();
  });
}
