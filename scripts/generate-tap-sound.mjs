import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const sampleRate = 44_100;
const duration = 0.11;
const sampleCount = Math.floor(sampleRate * duration);
const dataSize = sampleCount * 2;
const buffer = Buffer.alloc(44 + dataSize);

buffer.write("RIFF", 0);
buffer.writeUInt32LE(36 + dataSize, 4);
buffer.write("WAVE", 8);
buffer.write("fmt ", 12);
buffer.writeUInt32LE(16, 16);
buffer.writeUInt16LE(1, 20);
buffer.writeUInt16LE(1, 22);
buffer.writeUInt32LE(sampleRate, 24);
buffer.writeUInt32LE(sampleRate * 2, 28);
buffer.writeUInt16LE(2, 32);
buffer.writeUInt16LE(16, 34);
buffer.write("data", 36);
buffer.writeUInt32LE(dataSize, 40);

for (let index = 0; index < sampleCount; index += 1) {
  const time = index / sampleRate;
  const progress = time / duration;
  const envelope = Math.exp(-progress * 6.8);
  const lowFrequency = 138 - 76 * progress;
  const highFrequency = 520 - 290 * progress;
  const low = Math.sin(2 * Math.PI * lowFrequency * time) * 0.72;
  const high = Math.sin(2 * Math.PI * highFrequency * time) * 0.2;
  const attack = Math.min(1, time / 0.004);
  const sample = Math.max(-1, Math.min(1, (low + high) * envelope * attack));
  buffer.writeInt16LE(Math.round(sample * 24_000), 44 + index * 2);
}

const output = resolve("public/assets/tap-pop.wav");
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, buffer);
console.log(output);
