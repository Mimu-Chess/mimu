export type MoveSoundKind = 'move' | 'capture' | 'castle' | 'promote' | 'check';

type ClickStep = {
    delay?: number;
    noiseGain: number;
    toneGain: number;
    toneFrequency: number;
    duration: number;
    highpass: number;
    lowpass: number;
};

const SOUND_PATTERNS: Record<MoveSoundKind, ClickStep[]> = {
    move: [
        {
            noiseGain: 0.1,
            toneGain: 0.028,
            toneFrequency: 210,
            duration: 0.042,
            highpass: 520,
            lowpass: 2600,
        },
    ],
    capture: [
        {
            noiseGain: 0.18,
            toneGain: 0.048,
            toneFrequency: 145,
            duration: 0.062,
            highpass: 300,
            lowpass: 1800,
        },
        {
            delay: 0.018,
            noiseGain: 0.05,
            toneGain: 0.018,
            toneFrequency: 110,
            duration: 0.05,
            highpass: 220,
            lowpass: 1200,
        },
    ],
    castle: [
        {
            noiseGain: 0.095,
            toneGain: 0.024,
            toneFrequency: 205,
            duration: 0.036,
            highpass: 520,
            lowpass: 2500,
        },
        {
            delay: 0.055,
            noiseGain: 0.09,
            toneGain: 0.022,
            toneFrequency: 220,
            duration: 0.034,
            highpass: 520,
            lowpass: 2500,
        },
    ],
    promote: [
        {
            noiseGain: 0.09,
            toneGain: 0.025,
            toneFrequency: 210,
            duration: 0.038,
            highpass: 520,
            lowpass: 2500,
        },
        {
            delay: 0.048,
            noiseGain: 0.06,
            toneGain: 0.03,
            toneFrequency: 320,
            duration: 0.05,
            highpass: 900,
            lowpass: 3200,
        },
    ],
    check: [
        {
            noiseGain: 0.07,
            toneGain: 0.028,
            toneFrequency: 320,
            duration: 0.034,
            highpass: 1100,
            lowpass: 3600,
        },
        {
            delay: 0.045,
            noiseGain: 0.085,
            toneGain: 0.032,
            toneFrequency: 430,
            duration: 0.038,
            highpass: 1400,
            lowpass: 4200,
        },
    ],
};

let audioContext: AudioContext | null = null;
let noiseBufferCache: AudioBuffer | null = null;

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

function getNoiseBuffer(context: AudioContext): AudioBuffer {
    if (noiseBufferCache && noiseBufferCache.sampleRate === context.sampleRate) {
        return noiseBufferCache;
    }

    const duration = 0.12;
    const frameCount = Math.ceil(context.sampleRate * duration);
    const buffer = context.createBuffer(1, frameCount, context.sampleRate);
    const channel = buffer.getChannelData(0);

    for (let index = 0; index < frameCount; index += 1) {
        channel[index] = (Math.random() * 2 - 1) * (1 - index / frameCount);
    }

    noiseBufferCache = buffer;
    return buffer;
}

function scheduleGainEnvelope(gain: AudioParam, startAt: number, duration: number, peak: number) {
    const attackEnd = startAt + Math.min(0.003, duration * 0.18);
    const decayMid = startAt + duration * 0.45;
    const endAt = startAt + duration;

    gain.setValueAtTime(0.0001, startAt);
    gain.exponentialRampToValueAtTime(peak, attackEnd);
    gain.exponentialRampToValueAtTime(Math.max(0.0001, peak * 0.24), decayMid);
    gain.exponentialRampToValueAtTime(0.0001, endAt);
}

function scheduleClick(context: AudioContext, destination: AudioNode, startAt: number, step: ClickStep) {
    const endAt = startAt + step.duration;

    const noiseSource = context.createBufferSource();
    noiseSource.buffer = getNoiseBuffer(context);

    const highpass = context.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.setValueAtTime(step.highpass, startAt);

    const lowpass = context.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(step.lowpass, startAt);
    lowpass.Q.setValueAtTime(0.7, startAt);

    const noiseGain = context.createGain();
    scheduleGainEnvelope(noiseGain.gain, startAt, step.duration, step.noiseGain);

    noiseSource.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(noiseGain);
    noiseGain.connect(destination);

    const toneOscillator = context.createOscillator();
    toneOscillator.type = 'triangle';
    toneOscillator.frequency.setValueAtTime(step.toneFrequency, startAt);
    toneOscillator.frequency.exponentialRampToValueAtTime(Math.max(80, step.toneFrequency * 0.72), endAt);

    const toneGain = context.createGain();
    scheduleGainEnvelope(toneGain.gain, startAt, step.duration * 0.95, step.toneGain);

    toneOscillator.connect(toneGain);
    toneGain.connect(destination);

    noiseSource.start(startAt);
    noiseSource.stop(endAt + 0.01);
    toneOscillator.start(startAt);
    toneOscillator.stop(endAt + 0.01);

    noiseSource.onended = () => {
        noiseGain.disconnect();
        lowpass.disconnect();
        highpass.disconnect();
    };

    toneOscillator.onended = () => {
        toneGain.disconnect();
    };
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
    masterGain.gain.setValueAtTime(0.72, context.currentTime);
    masterGain.connect(context.destination);

    const compressor = context.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-18, context.currentTime);
    compressor.knee.setValueAtTime(10, context.currentTime);
    compressor.ratio.setValueAtTime(3, context.currentTime);
    compressor.attack.setValueAtTime(0.002, context.currentTime);
    compressor.release.setValueAtTime(0.06, context.currentTime);
    compressor.connect(masterGain);

    const startAt = context.currentTime + 0.008;
    const totalDuration = pattern.reduce((maxDuration, step) => Math.max(maxDuration, (step.delay ?? 0) + step.duration), 0);

    pattern.forEach((step) => {
        scheduleClick(context, compressor, startAt + (step.delay ?? 0), step);
    });

    window.setTimeout(() => {
        compressor.disconnect();
        masterGain.disconnect();
    }, Math.max(140, (totalDuration + 0.12) * 1000));
}
