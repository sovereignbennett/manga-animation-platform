/**
 * AudioExtractor — grab an audio track from a video file (browser).
 * Uses HTMLMediaElement + WebAudio, no third-party libraries.
 */
export const AudioExtractor = {
  async fromFile(file: File): Promise<ArrayBuffer> {
    return await file.arrayBuffer();
  },
  async fromVideoUrl(url: string, ctx: AudioContext, seconds = 60): Promise<Float32Array> {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.src = url;
    await new Promise<void>((res, rej) => {
      video.addEventListener("loadedmetadata", () => res(), { once: true });
      video.addEventListener("error", () => rej(new Error("video load failed")), { once: true });
    });
    const source = ctx.createMediaElementSource(video);
    const processor = ctx.createScriptProcessor(4096, 2, 1);
    const chunks: Float32Array[] = [];
    processor.onaudioprocess = (e) => {
      chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
    };
    source.connect(processor);
    processor.connect(ctx.destination);
    video.play();
    await new Promise((r) => setTimeout(r, seconds * 1000));
    video.pause();
    processor.disconnect();
    source.disconnect();
    let total = 0;
    for (const c of chunks) total += c.length;
    const out = new Float32Array(total);
    let off = 0;
    for (const c of chunks) { out.set(c, off); off += c.length; }
    return out;
  },
};
