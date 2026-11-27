type Cue = 'cast' | 'heavy' | 'empty' | 'gold' | 'jackpot' | 'cut' | 'buy' | 'pass' | 'fail';
const notes: Record<Cue, number[]> = {
  cast: [262, 330], heavy: [110, 98], empty: [220, 165], gold: [523, 659, 784],
  jackpot: [392, 523, 659, 784, 1047], cut: [185, 147], buy: [440, 660],
  pass: [392, 523, 659, 784], fail: [349, 277, 220],
};

export class Sound {
  private context: AudioContext | undefined;
  private output: GainNode | undefined;
  muted = false;

  unlock() {
    if (this.muted || typeof AudioContext === 'undefined') return;
    if (!this.context) {
      this.context = new AudioContext();
      this.output = this.context.createGain();
      this.output.gain.value = .6;
      this.output.connect(this.context.destination);
    }
    if (this.context.state === 'suspended') void this.context.resume().catch(() => {});
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (this.output && this.context) this.output.gain.setValueAtTime(muted ? 0 : .6, this.context.currentTime);
  }

  play(cue: Cue) {
    const ctx = this.context;
    const output = this.output;
    if (this.muted || !ctx || !output || ctx.state !== 'running') return;
    const start = ctx.currentTime;
    notes[cue].forEach((frequency, index) => {
      const oscillator = ctx.createOscillator();
      const envelope = ctx.createGain();
      const time = start + index * .065;
      oscillator.type = cue === 'heavy' || cue === 'cut' ? 'triangle' : 'sine';
      oscillator.frequency.setValueAtTime(frequency, time);
      envelope.gain.setValueAtTime(.001, time);
      envelope.gain.exponentialRampToValueAtTime(.13, time + .016);
      envelope.gain.exponentialRampToValueAtTime(.001, time + .16);
      oscillator.connect(envelope).connect(output);
      oscillator.start(time);
      oscillator.stop(time + .17);
    });
  }
}
