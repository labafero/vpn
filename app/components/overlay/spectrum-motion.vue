<template>
  <div
    ref="container"
    class="relative min-h-0 flex-1 overflow-hidden bg-neutral-950"
    aria-hidden="true"
  >
    <div
      class="pointer-events-none absolute inset-0 z-10 bg-linear-to-b from-transparent via-transparent to-black/40"
    />
  </div>
</template>

<script lang="ts" setup>
import type P5 from "p5";

const props = defineProps<{
  forceNoSignal?: boolean;
}>();

const container = useTemplateRef("container");
const route = useRoute();

let sketch: P5 | null = null;
let resizeObserver: ResizeObserver | null = null;
let mediaStream: MediaStream | null = null;
let audioContext: AudioContext | null = null;
let audioSource: MediaStreamAudioSourceNode | null = null;
let analyser: AnalyserNode | null = null;
let frequencyData: Uint8Array<ArrayBuffer> | null = null;
let disposed = false;

const requestedDevice = computed(() => {
  const value = route.query.audioDevice;
  return typeof value === "string" ? value.trim() : "";
});

function dimensions() {
  return {
    width: Math.max(1, container.value?.clientWidth ?? 1),
    height: Math.max(1, container.value?.clientHeight ?? 1),
  };
}

async function openAudioStream() {
  if (!navigator.mediaDevices?.getUserMedia) return;

  let stream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: false,
  });

  if (requestedDevice.value) {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const normalizedName = requestedDevice.value.toLocaleLowerCase();
    const match = devices.find(
      (device) =>
        device.kind === "audioinput" &&
        device.label.toLocaleLowerCase().includes(normalizedName),
    );

    if (match) {
      stream.getTracks().forEach((track) => track.stop());
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: { exact: match.deviceId } },
        video: false,
      });
    }
  }

  if (disposed) {
    stream.getTracks().forEach((track) => track.stop());
    return;
  }

  mediaStream = stream;
  audioContext = new AudioContext();
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 512;
  analyser.smoothingTimeConstant = 0.82;
  analyser.minDecibels = -90;
  analyser.maxDecibels = -20;
  frequencyData = new Uint8Array(analyser.frequencyBinCount);
  audioSource = audioContext.createMediaStreamSource(stream);
  audioSource.connect(analyser);
  await audioContext.resume();
}

onMounted(async () => {
  const host = container.value;
  if (!host) return;

  if (!props.forceNoSignal) {
    void openAudioStream().catch((error: unknown) => {
      console.warn(
        "Não foi possível capturar a entrada de áudio do Spectrum",
        error,
      );
    });
  }

  const { default: P5 } = await import("p5");
  if (disposed) return;

  sketch = new P5((p) => {
    const levels: number[] = [];
    let lastSignalAt = 0;

    function drawNoSignal(time: number) {
      p.noStroke();
      p.background(0, 0, 6);

      const cellWidth = 8;
      const cellHeight = 6;
      for (let y = 0; y < p.height; y += cellHeight) {
        for (let x = 0; x < p.width; x += cellWidth) {
          const brightness = p.random(8, 72);
          p.fill(0, 0, brightness, p.random(22, 68));
          p.rect(x, y, cellWidth, cellHeight);
        }
      }

      for (let line = 0; line < p.height; line += 4) {
        p.fill(0, 0, 0, 32);
        p.rect(0, line, p.width, 1);
      }

      const glitchY = (time * 900) % (p.height + 60) - 30;
      p.fill(190, 90, 100, 16);
      p.rect(-18, glitchY, p.width + 36, 8);
      p.fill(330, 85, 100, 13);
      p.rect(12, glitchY + 9, p.width - 24, 4);

      if (p.frameCount % 7 === 0) {
        const tearY = p.random(p.height);
        p.fill(0, 0, 100, 18);
        p.rect(0, tearY, p.width, p.random(2, 12));
      }

      p.fill(0, 0, 0, 72);
      p.rect(p.width / 2 - 150, p.height / 2 - 42, 300, 84, 4);
      p.fill(0, 0, 100, 92);
      p.textAlign(p.CENTER, p.CENTER);
      p.textStyle(p.BOLD);
      p.textSize(24);
      p.text("SEM SINAL", p.width / 2, p.height / 2 - 10);
      p.textStyle(p.NORMAL);
      p.textSize(10);
      p.text("ENTRADA DE ÁUDIO", p.width / 2, p.height / 2 + 19);
    }

    p.setup = () => {
      const { width, height } = dimensions();
      p.createCanvas(width, height).parent(host);
      p.pixelDensity(1);
      p.frameRate(30);
      p.colorMode(p.HSB, 360, 100, 100, 100);
      p.noStroke();
    };

    p.draw = () => {
      const time = p.millis() * 0.00025;
      const columnCount = Math.max(48, Math.floor(p.width / 18));
      const gap = 3;
      const columnWidth = p.width / columnCount;
      const centerY = p.height / 2;
      const hasAudio = Boolean(analyser && frequencyData);

      if (analyser && frequencyData) {
        analyser.getByteFrequencyData(frequencyData);
      }

      const signalPeak = frequencyData
        ? frequencyData.reduce((peak, value) => Math.max(peak, value), 0) / 255
        : 0;

      if (signalPeak > 0.025) lastSignalAt = p.millis();

      const isSignalLost =
        props.forceNoSignal || !hasAudio || p.millis() - lastSignalAt > 1800;

      if (isSignalLost) {
        drawNoSignal(time);
        return;
      }

      p.background(240, 25, 4);

      for (let index = 0; index < columnCount; index += 1) {
        const progress = index / Math.max(1, columnCount - 1);
        const noise = p.noise(index * 0.13, time);
        const pulse = (Math.sin(time * 8 + index * 0.22) + 1) / 2;
        const envelope = Math.sin(progress * Math.PI);
        const binIndex = Math.floor(
          progress ** 2.2 * Math.max(0, (frequencyData?.length ?? 1) - 1),
        );
        const audioLevel = (frequencyData?.[binIndex] ?? 0) / 255;
        const targetLevel = hasAudio
          ? audioLevel
          : 0.18 + noise * 0.48 + pulse * 0.12;
        const previousLevel = levels[index] ?? 0;
        const level = Math.max(targetLevel, previousLevel * 0.88);
        levels[index] = level;
        const amplitude = 8 + envelope * p.height * (0.06 + level * 0.78);
        const hue = (185 + progress * 220) % 360;
        const x = index * columnWidth + gap / 2;

        p.fill(hue, 78, 100, 78);
        p.rect(
          x,
          centerY - amplitude / 2,
          Math.max(1, columnWidth - gap),
          amplitude,
          2,
        );

        p.fill(hue, 65, 100, 14);
        p.rect(
          x,
          centerY - amplitude * 0.72,
          Math.max(1, columnWidth - gap),
          amplitude * 1.44,
          2,
        );
      }

      p.noFill();
      for (let layer = 0; layer < 3; layer += 1) {
        const frequencyIndex = Math.floor(
          ((layer + 1) / 5) * Math.max(0, (frequencyData?.length ?? 1) - 1),
        );
        const audioEnergy = (frequencyData?.[frequencyIndex] ?? 0) / 255;
        const waveEnergy = hasAudio ? 4 + audioEnergy * 28 : 9 + layer * 4;

        p.stroke((195 + layer * 75) % 360, 70, 100, 40 - layer * 8);
        p.strokeWeight(1.5);
        p.beginShape();

        for (let x = 0; x <= p.width; x += 12) {
          const progress = x / p.width;
          const wave =
            Math.sin(progress * Math.PI * (5 + layer) + time * (9 - layer)) *
            waveEnergy;
          const drift =
            (p.noise(progress * 3 + layer * 10, time * 1.8) - 0.5) *
            waveEnergy;
          p.vertex(x, centerY + wave + drift);
        }

        p.endShape();
      }

      p.noStroke();
    };
  }, host);

  resizeObserver = new ResizeObserver(() => {
    if (!sketch) return;
    const { width, height } = dimensions();
    sketch.resizeCanvas(width, height);
  });
  resizeObserver.observe(host);
});

onBeforeUnmount(() => {
  disposed = true;
  resizeObserver?.disconnect();
  sketch?.remove();
  audioSource?.disconnect();
  mediaStream?.getTracks().forEach((track) => track.stop());
  void audioContext?.close();
});
</script>
