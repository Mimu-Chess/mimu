export type MoveSoundKind = 'move' | 'capture' | 'castle' | 'promote' | 'check';

type SoundStep = {
    frequency: number;
    duration: number;
    gain: number;
    delay?: number;
    type?: OscillatorType;
};

const SOUND_PATTERNS: Record<MoveSoundKind, SoundStep[]> = {
    move: [
        { frequency: 540, duration: 0.04, gain: 0.12, type: 'triangle' },
        { frequency: 680, duration: 0.035, gain: 0.08, delay: 0.03, type: 'triangle' },
    ],
    capture: [
        { frequency: 370, duration: 0.04, gain: 0.13, type: 'square' },
        { frequency: 240, duration: 0.05, gain: 0.07, delay: 0.035, type: 'triangle' },
    ],
    castle: [
        { frequency: 480, duration: 0.035, gain: 0.11, type: 'triangle' },
        { frequency: 620, duration: 0.045, gain: 0.09, delay: 0.028, type: 'triangle' },
        { frequency: 780, duration: 0.05, gain: 0.08, delay: 0.058, type: 'sine' },
    ],
    promote: [
        { frequency: 520, duration: 0.04, gain: 0.09, type: 'triangle' },
        { frequency: 720, duration: 0.04, gain: 0.1, delay: 0.025, type: 'triangle' },
        { frequency: 960, duration: 0.06, gain: 0.08, delay: 0.055, type: 'sine' },
    ],
    check: [
        { frequency: 330, duration: 0.04, gain: 0.11, type: 'square' },
        { frequency: 660, duration: 0.055, gain: 0.08, delay: 0.03, type: 'triangle' },
    ],
};

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') {
        return null;
    }

    const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) {
        return null;
    }

    if (!audioContext) {
        audioContext = new AudioContextCtor();
    }

    return audioContext;
}

export async function playMoveSound(kind: MoveSoundKind): Promise<void> {
    const context = getAudioContext();
    if (!context) {
        return;
    }

    try {
        if (context.state === 'suspended') {
            await context.resume();
        }
    }
    catch {
        return;
    }

    const pattern = SOUND_PATTERNS[kind];
    const masterGain = context.createGain();
    masterGain.gain.setValueAtTime(0.26, context.currentTime);
    masterGain.connect(context.destination);

    const startAt = context.currentTime + 0.01;
    const totalDuration = pattern.reduce((maxDuration, step) => Math.max(maxDuration, (step.delay ?? 0) + step.duration), 0);

    pattern.forEach((step) => {
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();
        const stepStart = startAt + (step.delay ?? 0);
        const stepEnd = stepStart + step.duration;

        oscillator.type = step.type ?? 'triangle';
        oscillator.frequency.setValueAtTime(step.frequency, stepStart);

        gainNode.gain.setValueAtTime(0.0001, stepStart);
        gainNode.gain.exponentialRampToValueAtTime(step.gain, stepStart + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, stepEnd);

        oscillator.connect(gainNode);
        gainNode.connect(masterGain);

        oscillator.start(stepStart);
        oscillator.stop(stepEnd + 0.01);
        oscillator.onended = () => {
            gainNode.disconnect();
        };
    });

    window.setTimeout(() => {
        masterGain.disconnect();
    }, Math.max(120, (totalDuration + 0.1) * 1000));
}
