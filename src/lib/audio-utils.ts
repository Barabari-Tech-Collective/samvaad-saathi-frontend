// Audio processing utilities for resampling and format conversion

// Extend Window interface for webkitAudioContext
declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

/**
 * Resamples audio to 16kHz sample rate
 * @param audioBlob - The original audio blob to resample
 * @returns Promise<Blob> - The resampled audio blob
 */
export const resampleAudioTo16kHz = async (audioBlob: Blob): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const audioContext = new AudioContextClass({
      sampleRate: 16000,
    });

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const arrayBuffer = reader.result as ArrayBuffer;
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        // Create a new audio buffer with 16kHz sample rate
        const targetSampleRate = 16000;
        const targetLength = Math.floor(
          (audioBuffer.length * targetSampleRate) / audioBuffer.sampleRate
        );
        const resampledBuffer = audioContext.createBuffer(
          audioBuffer.numberOfChannels,
          targetLength,
          targetSampleRate
        );

        // Simple linear interpolation resampling
        for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
          const inputData = audioBuffer.getChannelData(channel);
          const outputData = resampledBuffer.getChannelData(channel);

          for (let i = 0; i < targetLength; i++) {
            const inputIndex = (i * audioBuffer.length) / targetLength;
            const index = Math.floor(inputIndex);
            const fraction = inputIndex - index;

            if (index + 1 < inputData.length) {
              outputData[i] = inputData[index] * (1 - fraction) + inputData[index + 1] * fraction;
            } else {
              outputData[i] = inputData[index];
            }
          }
        }

        // Convert back to blob
        const wavBlob = audioBufferToWav(resampledBuffer);
        resolve(wavBlob);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = reject;
    reader.readAsArrayBuffer(audioBlob);
  });
};

/**
 * Converts AudioBuffer to WAV blob format
 * @param audioBuffer - The AudioBuffer to convert
 * @returns Blob - The WAV format blob
 */
const audioBufferToWav = (audioBuffer: AudioBuffer): Blob => {
  const numberOfChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const length = audioBuffer.length;
  const arrayBuffer = new ArrayBuffer(44 + length * numberOfChannels * 2);
  const view = new DataView(arrayBuffer);

  // WAV header
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + length * numberOfChannels * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numberOfChannels * 2, true);
  view.setUint16(32, numberOfChannels * 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, length * numberOfChannels * 2, true);

  // Convert float samples to 16-bit PCM
  let offset = 44;
  for (let i = 0; i < length; i++) {
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, audioBuffer.getChannelData(channel)[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: "audio/wav" });
};

/**
 * Audio constraints for 16kHz recording
 */
export const AUDIO_CONSTRAINTS_16KHZ = {
  sampleRate: 16000,
  channelCount: 1,
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
} as const;

/**
 * Audio analysis context for waveform visualization
 */
export interface AudioAnalysisContext {
  audioContext: AudioContext;
  analyser: AnalyserNode;
  stream: MediaStream;
}

/**
 * Creates an audio analysis context from a media stream
 * @param stream - The media stream to analyze
 * @returns AudioAnalysisContext with audioContext, analyser, and stream
 */
export const createAudioAnalysisContext = (stream: MediaStream): AudioAnalysisContext => {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    throw new Error("AudioContext is not supported in this browser");
  }

  const audioContext = new AudioContextClass();
  const analyser = audioContext.createAnalyser();
  const microphone = audioContext.createMediaStreamSource(stream);

  // Use larger FFT size for better frequency resolution
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.8; // Smoothing factor (0-1, higher = smoother)
  microphone.connect(analyser);

  return {
    audioContext,
    analyser,
    stream,
  };
};

/**
 * Gets smoothed waveform data from an analyser node
 * @param analyser - The AnalyserNode to read from
 * @param barCount - Number of bars to generate (default: 20)
 * @returns Array of bar heights (0-100)
 */
const getSmoothedWaveformData = (analyser: AnalyserNode, barCount: number = 20): number[] => {
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  // Get frequency data
  analyser.getByteFrequencyData(dataArray);

  // Create smoothed bars with averaging and better frequency mapping
  const bars: number[] = [];
  const minBarHeight = 8; // Minimum bar height percentage

  for (let i = 0; i < barCount; i++) {
    // Map bar index to frequency range (voice frequencies are typically 85-255 Hz for fundamental, up to 3400 Hz)
    // Focus on lower frequencies for voice visualization
    const startFreq = Math.floor((i / barCount) * bufferLength * 0.5); // Use lower half of spectrum
    const endFreq = Math.floor(((i + 1) / barCount) * bufferLength * 0.5);

    // Average the values in this frequency range for smoother visualization
    let sum = 0;
    let count = 0;
    for (let j = startFreq; j < endFreq && j < bufferLength; j++) {
      sum += dataArray[j];
      count++;
    }

    const average = count > 0 ? sum / count : 0;
    // Convert to percentage (0-100) with minimum height
    const height = Math.max(minBarHeight, (average / 255) * 100);

    bars.push(height);
  }

  return bars;
};

/**
 * Starts waveform animation loop
 * @param analyser - The AnalyserNode to read from
 * @param onUpdate - Callback function called with waveform data on each frame
 * @returns Function to stop the animation
 */
export const startWaveformAnimation = (
  analyser: AnalyserNode,
  onUpdate: (bars: number[]) => void
): (() => void) => {
  let animationFrameId: number | undefined;
  let isRunning = true;

  const update = () => {
    if (!isRunning) return;

    const bars = getSmoothedWaveformData(analyser);
    onUpdate(bars);

    animationFrameId = requestAnimationFrame(update);
  };

  update();

  // Return stop function
  return () => {
    isRunning = false;
    if (animationFrameId !== undefined) {
      cancelAnimationFrame(animationFrameId);
    }
  };
};

/**
 * Cleans up audio analysis resources
 * @param context - The AudioAnalysisContext to clean up
 */
export const cleanupAudioAnalysis = (context: AudioAnalysisContext | null): void => {
  if (!context) return;

  try {
    // Stop all tracks
    context.stream.getTracks().forEach((track) => track.stop());

    // Close audio context
    if (context.audioContext.state !== "closed") {
      context.audioContext.close();
    }
  } catch (error) {
    console.error("Error cleaning up audio analysis:", error);
  }
};
