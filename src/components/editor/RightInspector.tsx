import { useRef } from "react";
import { Diamond, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import {
  getLayerEndFrame,
  getLayerStartFrame,
  useEditor,
  type BlendMode,
  type Layer,
} from "@/store/editorStore";
import { cn } from "@/lib/utils";
import type { AnimatableProp } from "@/types/animation";
import type { EffectKind, LayerEffect, ShakeAnimatableProp, ShakeEffect } from "@/types/effects";
import {
  EFFECT_DEFAULTS,
  EFFECT_LABELS,
  normalizeShakeParams,
  removeEffectKeyframe,
  upsertEffectKeyframe,
} from "@/types/effects";
import { renderText, SYSTEM_FONTS, type TextProps } from "@/services/text/renderText";
import { ShakeRegistry, type ShakeParams } from "@/services/shakes";
import type { EasingName } from "@/utils/easing";

const BLENDS: BlendMode[] = ["normal", "multiply", "screen", "overlay", "add", "lighten", "darken"];

export function RightInspector() {
  const project = useEditor((s) => s.project);
  const selectedIds = useEditor((s) => s.selectedIds);
  const currentFrame = useEditor((s) => s.currentFrame);
  const totalFrames = useEditor((s) => s.totalFrames);
  const fps = useEditor((s) => s.fps);
  const updateLayer = useEditor((s) => s.updateLayer);
  const pushHistory = useEditor((s) => s.pushHistory);
  const setKeyframe = useEditor((s) => s.setKeyframe);
  const removeKeyframe = useEditor((s) => s.removeKeyframe);
  const addEffect = useEditor((s) => s.addEffect);
  const updateEffect = useEditor((s) => s.updateEffect);
  const removeEffect = useEditor((s) => s.removeEffect);
  const selectedEffect = useEditor((s) => s.selectedEffect);
  const setSelectedEffect = useEditor((s) => s.setSelectedEffect);
  const layer = project.layers.find((l) => l.id === selectedIds[0]);
  const focusedEffect =
    layer && selectedEffect?.layerId === layer.id
      ? layer.effects?.[selectedEffect.index]
      : undefined;

  const hasKf = (prop: AnimatableProp) =>
    !!layer?.keyframes?.[prop]?.some((k) => k.frame === currentFrame);

  const toggleKf = (prop: AnimatableProp) => {
    if (!layer) return;
    if (hasKf(prop)) removeKeyframe(layer.id, prop, currentFrame);
    else setKeyframe(layer.id, prop, currentFrame, layer[prop] as number);
  };

  const updateText = (patch: Partial<TextProps>) => {
    if (!layer?.text) return;
    const text = { ...layer.text, ...patch };
    const rendered = renderText(text);
    updateLayer(layer.id, {
      text,
      src: rendered.src,
      width: rendered.width,
      height: rendered.height,
    });
  };

  const startFrame = layer ? getLayerStartFrame(layer) : 0;
  const endFrame = layer ? getLayerEndFrame(layer, totalFrames) : totalFrames;
  const durationFrames = Math.max(1, endFrame - startFrame);
  const playbackRate = Math.max(0.1, Math.min(8, layer?.playbackRate ?? 1));
  const sourceTime =
    layer?.mediaType === "video"
      ? Math.min(
          layer.videoDurationSec ?? 0,
          Math.max(0, ((currentFrame - startFrame) / fps) * playbackRate),
        )
      : 0;

  const updateTiming = (patch: Partial<Layer>) => {
    if (!layer) return;
    updateLayer(layer.id, patch);
  };

  const fitClipToSource = () => {
    if (!layer?.videoDurationSec) return;
    pushHistory();
    const frames = Math.max(1, Math.round((layer.videoDurationSec / playbackRate) * fps));
    updateLayer(layer.id, { endFrame: Math.min(totalFrames, startFrame + frames) });
  };

  const moveFocusedEffect = (delta: number) => {
    if (!layer || selectedEffect?.layerId !== layer.id || !layer.effects) return;
    const from = selectedEffect.index;
    const to = Math.max(0, Math.min(layer.effects.length - 1, from + delta));
    if (from === to) return;
    pushHistory();
    const effects = [...layer.effects];
    const [item] = effects.splice(from, 1);
    effects.splice(to, 0, item);
    updateLayer(layer.id, { effects });
    setSelectedEffect({ layerId: layer.id, index: to });
  };

  const resetFocusedEffect = () => {
    if (!layer || !focusedEffect || selectedEffect?.layerId !== layer.id) return;
    pushHistory();
    updateEffect(layer.id, selectedEffect.index, { ...EFFECT_DEFAULTS[focusedEffect.kind] } as Partial<LayerEffect>);
  };

  return (
    <aside className="hidden xl:flex w-70 shrink-0 border-l border-border bg-panel/60 backdrop-blur flex-col">
      <div className="h-11 shrink-0 flex items-center px-3 border-b border-border">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Inspector</h2>
        <div className="ml-auto text-[10px] font-mono text-muted-foreground">f {currentFrame}</div>
      </div>

      {!layer ? (
        <div className="p-4 text-xs text-muted-foreground">
          Select a layer to edit its transform, opacity, blend mode and color.
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto scroll-thin p-3 space-y-4">
          <div className="text-xs font-semibold truncate">{layer.name}</div>

          <Section title="Clip Timing">
            <Row>
              <NumField
                label="Start"
                value={startFrame}
                onFocus={pushHistory}
                onChange={(v) => updateTiming({ startFrame: Math.max(0, Math.min(endFrame - 1, Math.round(v))) })}
              />
              <NumField
                label="End"
                value={endFrame}
                onFocus={pushHistory}
                onChange={(v) => updateTiming({ endFrame: Math.max(startFrame + 1, Math.min(totalFrames, Math.round(v))) })}
              />
            </Row>
            <Row>
              <NumField
                label="Fade In"
                value={layer.fadeInFrames ?? 0}
                onFocus={pushHistory}
                onChange={(v) => updateTiming({ fadeInFrames: Math.max(0, Math.min(durationFrames - 1, Math.round(v))) })}
              />
              <NumField
                label="Fade Out"
                value={layer.fadeOutFrames ?? 0}
                onFocus={pushHistory}
                onChange={(v) => updateTiming({ fadeOutFrames: Math.max(0, Math.min(durationFrames - 1, Math.round(v))) })}
              />
            </Row>
            <div className="rounded-md border border-border bg-surface-2/40 px-2 py-1.5 text-[11px] text-muted-foreground">
              Duration <span className="font-mono text-foreground/80">{durationFrames}f</span>
              <span className="mx-1.5 text-border-strong">/</span>
              <span className="font-mono text-foreground/80">{(durationFrames / fps).toFixed(2)}s</span>
            </div>
          </Section>

          {layer.mediaType === "video" && (
            <Section title="Video Speed">
              <Slider
                value={playbackRate}
                min={0.1}
                max={8}
                step={0.05}
                onFocus={pushHistory}
                onChange={(v) => updateTiming({ playbackRate: Math.max(0.1, Math.min(8, v)) })}
                valueLabel={`${playbackRate.toFixed(2)}x`}
              />
              <div className="grid grid-cols-5 gap-1">
                {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4, 8].map((rate) => (
                  <button
                    key={rate}
                    onClick={() => { pushHistory(); updateTiming({ playbackRate: rate }); }}
                    className={cn(
                      "h-7 rounded-md border text-[10px] font-mono",
                      Math.abs(playbackRate - rate) < 0.01 ? "border-primary/50 bg-primary/15 text-primary" : "border-border bg-surface-2 text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
              <div className="rounded-md border border-border bg-surface-2/40 px-2 py-1.5 text-[11px] text-muted-foreground">
                Source <span className="font-mono text-foreground/80">{(layer.videoDurationSec ?? 0).toFixed(2)}s</span>
                <span className="mx-1.5 text-border-strong">/</span>
                Local <span className="font-mono text-foreground/80">{sourceTime.toFixed(2)}s</span>
              </div>
              <button
                onClick={fitClipToSource}
                className="h-8 w-full rounded-md border border-border bg-surface-2 text-xs text-muted-foreground hover:text-foreground"
              >
                Fit clip to source
              </button>
            </Section>
          )}

          {layer.text && (
            <Section title="Text">
              <textarea
                value={layer.text.content}
                onChange={(e) => updateText({ content: e.target.value })}
                className="min-h-20 w-full resize-y rounded-md border border-border bg-surface-2 px-2 py-1.5 text-xs outline-none focus:border-primary/60"
              />
              <Row>
                <label className="block">
                  <div className="text-[10px] text-muted-foreground mb-1">Font</div>
                  <select
                    value={layer.text.fontFamily}
                    onChange={(e) => updateText({ fontFamily: e.target.value })}
                    className="w-full h-8 rounded-md border border-border bg-surface-2 px-2 text-xs outline-none focus:border-primary/60"
                  >
                    {SYSTEM_FONTS.map((font) => <option key={font}>{font}</option>)}
                  </select>
                </label>
                <NumField label="Size" value={layer.text.fontSize} onChange={(v) => updateText({ fontSize: Math.max(8, v) })} />
              </Row>
              <Row>
                <label className="block">
                  <div className="text-[10px] text-muted-foreground mb-1">Color</div>
                  <input
                    type="color"
                    value={layer.text.color}
                    onChange={(e) => updateText({ color: e.target.value })}
                    className="w-full h-8 rounded-md border border-border bg-surface-2 px-1"
                  />
                </label>
                <label className="block">
                  <div className="text-[10px] text-muted-foreground mb-1">Align</div>
                  <select
                    value={layer.text.align}
                    onChange={(e) => updateText({ align: e.target.value as TextProps["align"] })}
                    className="w-full h-8 rounded-md border border-border bg-surface-2 px-2 text-xs outline-none focus:border-primary/60"
                  >
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </select>
                </label>
              </Row>
              <div className="grid grid-cols-3 gap-1">
                <ToggleButton active={layer.text.bold} onClick={() => updateText({ bold: !layer.text!.bold })}>B</ToggleButton>
                <ToggleButton active={layer.text.italic} onClick={() => updateText({ italic: !layer.text!.italic })}>I</ToggleButton>
                <ToggleButton active={layer.text.underline} onClick={() => updateText({ underline: !layer.text!.underline })}>U</ToggleButton>
              </div>
            </Section>
          )}

          <Section title="Transform">
            <Row>
              <NumField label="X" value={layer.x} kf={hasKf("x")} onKf={() => toggleKf("x")} onChange={(v) => updateLayer(layer.id, { x: v })} />
              <NumField label="Y" value={layer.y} kf={hasKf("y")} onKf={() => toggleKf("y")} onChange={(v) => updateLayer(layer.id, { y: v })} />
            </Row>
            <Row>
              <NumField label="Scale X" value={layer.scaleX} step={0.01} kf={hasKf("scaleX")} onKf={() => toggleKf("scaleX")} onChange={(v) => updateLayer(layer.id, { scaleX: v })} />
              <NumField label="Scale Y" value={layer.scaleY} step={0.01} kf={hasKf("scaleY")} onKf={() => toggleKf("scaleY")} onChange={(v) => updateLayer(layer.id, { scaleY: v })} />
            </Row>
            <Row>
              <NumField label="Rotation°" value={layer.rotation} kf={hasKf("rotation")} onKf={() => toggleKf("rotation")} onChange={(v) => updateLayer(layer.id, { rotation: v })} />
              <div />
            </Row>
          </Section>

          <Section title="Anchor Point">
            <Row>
              <NumField label="Anchor X" value={layer.anchorX} step={0.01} kf={hasKf("anchorX")} onKf={() => toggleKf("anchorX")} onChange={(v) => updateLayer(layer.id, { anchorX: v })} />
              <NumField label="Anchor Y" value={layer.anchorY} step={0.01} kf={hasKf("anchorY")} onKf={() => toggleKf("anchorY")} onChange={(v) => updateLayer(layer.id, { anchorY: v })} />
            </Row>
            <AnchorGrid layer={layer} onSet={(x, y) => updateLayer(layer.id, { anchorX: x, anchorY: y })} />
          </Section>

          <Section title="Opacity" trailing={<KfDot on={hasKf("opacity")} onClick={() => toggleKf("opacity")} />}>
            <Slider value={layer.opacity} min={0} max={1} step={0.01} onChange={(v) => updateLayer(layer.id, { opacity: v })} />
          </Section>

          <Section title="Blend Mode">
            <div className="grid grid-cols-2 gap-1">
              {BLENDS.map((b) => (
                <button
                  key={b}
                  onClick={() => updateLayer(layer.id, { blendMode: b })}
                  className={cn(
                    "text-[11px] py-1.5 rounded-md border border-border capitalize",
                    layer.blendMode === b ? "bg-primary/15 text-primary border-primary/40" : "bg-surface-2 hover:bg-surface-3 text-muted-foreground",
                  )}
                >
                  {b}
                </button>
              ))}
            </div>
          </Section>

          <Section title="Effects">
            <div className="grid grid-cols-2 gap-1">
              {(["glow", "motionBlur", "chromatic", "shake", "impact"] as EffectKind[]).map((kind) => (
                <button
                  key={kind}
                  onClick={() => addEffect(layer.id, kind)}
                  className="inline-flex items-center justify-center gap-1 rounded-md border border-border bg-surface-2 px-2 py-1.5 text-[11px] hover:border-primary/40"
                >
                  <Plus className="w-3 h-3" /> {EFFECT_LABELS[kind]}
                </button>
              ))}
            </div>
            <div className="space-y-1.5">
              {(layer.effects ?? []).map((effect, index) => (
                <EffectRow
                  key={`${effect.kind}-${index}`}
                  effect={effect}
                  active={selectedEffect?.layerId === layer.id && selectedEffect.index === index}
                  onSelect={() => setSelectedEffect({ layerId: layer.id, index })}
                  onToggle={() => updateEffect(layer.id, index, { enabled: !effect.enabled } as Partial<LayerEffect>)}
                  onRemove={() => removeEffect(layer.id, index)}
                />
              ))}
              {(layer.effects ?? []).length === 0 && (
                <p className="text-[11px] text-muted-foreground">No effects on this layer yet.</p>
              )}
            </div>
          </Section>

          {focusedEffect && selectedEffect?.layerId === layer.id && (
            <Section title={`${EFFECT_LABELS[focusedEffect.kind]} Controls`}>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => updateEffect(layer.id, selectedEffect.index, { enabled: !focusedEffect.enabled } as Partial<LayerEffect>)}
                  className="h-8 flex-1 rounded-md border border-border bg-surface-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  {focusedEffect.enabled ? "Disable" : "Enable"}
                </button>
                <button onClick={() => moveFocusedEffect(-1)} className="h-8 px-2 rounded-md border border-border bg-surface-2 text-xs">Up</button>
                <button onClick={() => moveFocusedEffect(1)} className="h-8 px-2 rounded-md border border-border bg-surface-2 text-xs">Down</button>
              </div>
              <EffectInspectorHost
                effect={focusedEffect}
                layer={layer}
                effectIndex={selectedEffect.index}
                currentFrame={currentFrame}
                onChange={(patch) => updateEffect(layer.id, selectedEffect.index, patch)}
              />
              <div className="grid grid-cols-2 gap-1">
                <button
                  onClick={resetFocusedEffect}
                  className="h-8 rounded-md border border-border bg-surface-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  Reset
                </button>
                <button
                  onClick={() => removeEffect(layer.id, selectedEffect.index)}
                  className="h-8 rounded-md border border-border bg-surface-2 text-xs text-destructive"
                >
                  Remove
                </button>
              </div>
            </Section>
          )}

          <Section title="Color Adjustments">
            <p className="text-[11px] text-muted-foreground">Hue, saturation, brightness and curves will connect here in Phase 4.</p>
          </Section>
        </div>
      )}
    </aside>
  );
}

function ToggleButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "h-8 rounded-md border text-xs font-semibold",
        active ? "border-primary/50 bg-primary/15 text-primary" : "border-border bg-surface-2 text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

interface EffectEditorProps<T extends LayerEffect = LayerEffect> {
  effect: T;
  layer: Layer;
  effectIndex: number;
  currentFrame: number;
  onChange: (patch: Partial<LayerEffect>) => void;
}

const EFFECT_EDITORS: {
  [K in EffectKind]: React.ComponentType<EffectEditorProps<Extract<LayerEffect, { kind: K }>>>;
} = {
  glow: GlowEffectEditor,
  motionBlur: MotionBlurEffectEditor,
  chromatic: ChromaticEffectEditor,
  impact: ImpactEffectEditor,
  shake: ShakeEffectEditor,
};

function EffectInspectorHost(props: EffectEditorProps) {
  const Editor = EFFECT_EDITORS[props.effect.kind] as React.ComponentType<EffectEditorProps>;
  return <Editor {...props} />;
}

function GlowEffectEditor({ effect, onChange }: EffectEditorProps<Extract<LayerEffect, { kind: "glow" }>>) {
  return (
    <div className="space-y-2">
      <Slider value={effect.strength} min={0} max={12} step={0.1} onChange={(v) => onChange({ strength: v } as Partial<LayerEffect>)} valueLabel={effect.strength.toFixed(1)} />
      <NumField label="Inner Strength" value={effect.innerStrength} step={0.1} onChange={(v) => onChange({ innerStrength: Math.max(0, v) } as Partial<LayerEffect>)} />
      <NumField label="Quality" value={effect.quality} step={0.1} onChange={(v) => onChange({ quality: Math.max(0.1, Math.min(1, v)) } as Partial<LayerEffect>)} />
      <label className="block">
        <div className="text-[10px] text-muted-foreground mb-1">Color</div>
        <input type="color" value={effect.color} onChange={(e) => onChange({ color: e.target.value } as Partial<LayerEffect>)} className="w-full h-8 rounded-md border border-border bg-surface-2 px-1" />
      </label>
    </div>
  );
}

function MotionBlurEffectEditor({ effect, onChange }: EffectEditorProps<Extract<LayerEffect, { kind: "motionBlur" }>>) {
  return <NumField label="Amount" value={effect.amount} step={0.5} onChange={(v) => onChange({ amount: Math.max(0, v) } as Partial<LayerEffect>)} />;
}

function ChromaticEffectEditor({ effect, onChange }: EffectEditorProps<Extract<LayerEffect, { kind: "chromatic" }>>) {
  return (
    <Row>
      <NumField label="Offset" value={effect.offset} step={0.5} onChange={(v) => onChange({ offset: Math.max(0, v) } as Partial<LayerEffect>)} />
      <NumField label="Angle" value={effect.angle} step={1} onChange={(v) => onChange({ angle: v } as Partial<LayerEffect>)} />
    </Row>
  );
}

function ImpactEffectEditor({ effect, onChange }: EffectEditorProps<Extract<LayerEffect, { kind: "impact" }>>) {
  return (
    <div className="space-y-2">
      <Row>
        <NumField label="Frame" value={effect.frame} onChange={(v) => onChange({ frame: Math.max(0, Math.round(v)) } as Partial<LayerEffect>)} />
        <NumField label="Duration" value={effect.duration} onChange={(v) => onChange({ duration: Math.max(1, Math.round(v)) } as Partial<LayerEffect>)} />
      </Row>
      <Row>
        <NumField label="Scale" value={effect.scale} step={0.05} onChange={(v) => onChange({ scale: Math.max(0, v) } as Partial<LayerEffect>)} />
        <NumField label="Flash" value={effect.flash} step={0.05} onChange={(v) => onChange({ flash: Math.max(0, Math.min(1, v)) } as Partial<LayerEffect>)} />
      </Row>
    </div>
  );
}

function patchFromShakeParams(params: ShakeParams, presetId?: string): Partial<ShakeEffect> {
  return {
    presetId,
    profile: params.profile,
    intensity: params.intensity,
    speed: params.speed,
    frequency: params.frequency,
    randomness: params.randomness,
    x: params.x,
    y: params.y,
    rotation: params.rotation,
    rotational: (params.rotation * 180) / Math.PI,
    scale: params.scale,
    decay: params.decay,
    seed: params.seed,
    easing: params.easing,
    amplitude: Math.max(params.x, params.y),
  };
}

const SHAKE_DESCRIPTIONS: Record<string, string> = {
  impact: "Fast camera hit with quick decay and a tiny rebound.",
  punch: "Short horizontal hit with a snappy return.",
  earthquake: "Heavy unstable low-frequency movement and bursts.",
  camera: "Subtle human handheld drift with tiny rotation.",
  handheld: "Smooth natural drift for living stills.",
  whip: "Directional whip pan with elastic overshoot.",
  bass: "Musical pulse tied to beat-like movement.",
  glitch: "Digital jumps, freezes and discontinuous jitter.",
  bounce: "Vertical spring with diminishing bounces.",
  micro: "Barely visible high-frequency movement.",
  velocity: "Shake intensity shaped by motion velocity.",
  anime: "Anticipation, impact hold and recovery.",
};

function ShakeEffectEditor({ effect, currentFrame, onChange }: EffectEditorProps<ShakeEffect>) {
  const params = normalizeShakeParams(effect);
  const presets = ShakeRegistry.list();
  const hoverRestoreRef = useRef<ShakeEffect | null>(null);
  const set = (patch: Partial<ShakeParams>) => {
    const next = { ...params, ...patch };
    onChange(patchFromShakeParams(next, effect.presetId) as Partial<LayerEffect>);
  };
  const setExtra = (patch: Partial<ShakeEffect>) => onChange(patch as Partial<LayerEffect>);
  const keyframeParam = (prop: ShakeAnimatableProp, value: number) => {
    const track = effect.keyframes?.[prop] ?? [];
    const exists = track.some((kf) => kf.frame === currentFrame);
    const nextTrack = exists
      ? removeEffectKeyframe(track, currentFrame)
      : upsertEffectKeyframe(track, currentFrame, value);
    onChange({
      keyframes: {
        ...(effect.keyframes ?? {}),
        [prop]: nextTrack.length > 0 ? nextTrack : undefined,
      },
    } as Partial<LayerEffect>);
  };
  const selectedPreset = effect.presetId ? ShakeRegistry.get(effect.presetId) : undefined;

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-border bg-surface-2/40 p-2">
        <div className="flex items-center gap-2">
          <div className="text-xs font-semibold">{selectedPreset?.name ?? "Custom Shake"}</div>
          <div className="ml-auto rounded-sm border border-primary/40 bg-primary/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-primary">
            Current
          </div>
        </div>
        <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
          {selectedPreset ? SHAKE_DESCRIPTIONS[selectedPreset.id] ?? "Customisable camera motion." : "Manual shake settings."}
        </p>
        <div className="mt-2 h-8 overflow-hidden rounded bg-surface-3">
          <div className="h-full w-1/2 rounded bg-primary/60 animate-pulse" />
        </div>
      </div>
      <div>
        <div className="text-[10px] text-muted-foreground mb-1">Preset</div>
        <div className="grid grid-cols-2 gap-1">
          {presets.map((preset) => (
            <ShakePresetButton
              key={preset.id}
              active={effect.presetId === preset.id}
              name={preset.name}
              description={SHAKE_DESCRIPTIONS[preset.id]}
              onPreview={() => {
                hoverRestoreRef.current = effect;
                onChange(patchFromShakeParams(preset.params, preset.id) as Partial<LayerEffect>);
              }}
              onRestore={() => {
                if (hoverRestoreRef.current) {
                  onChange(hoverRestoreRef.current as Partial<LayerEffect>);
                  hoverRestoreRef.current = null;
                }
              }}
              onCommit={() => {
                hoverRestoreRef.current = null;
                onChange(patchFromShakeParams(preset.params, preset.id) as Partial<LayerEffect>);
              }}
            />
          ))}
        </div>
      </div>
      <Row>
        <ShakeNum label="Intensity" prop="intensity" value={params.intensity} step={0.1} currentFrame={currentFrame} effect={effect} onKf={keyframeParam} onChange={(v) => set({ intensity: Math.max(0, v) })} />
        <ShakeNum label="Speed" prop="speed" value={params.speed} step={0.1} currentFrame={currentFrame} effect={effect} onKf={keyframeParam} onChange={(v) => set({ speed: Math.max(0, v) })} />
      </Row>
      <Row>
        <ShakeNum label="Velocity" prop="velocity" value={effect.velocity ?? 1} step={0.1} currentFrame={currentFrame} effect={effect} onKf={keyframeParam} onChange={(v) => setExtra({ velocity: Math.max(0, v) })} />
        <ShakeNum label="Frequency" prop="frequency" value={params.frequency} step={0.5} currentFrame={currentFrame} effect={effect} onKf={keyframeParam} onChange={(v) => set({ frequency: Math.max(0, v) })} />
      </Row>
      <Row>
        <NumField label="Randomness" value={params.randomness} step={0.05} onChange={(v) => set({ randomness: Math.max(0, Math.min(1, v)) })} />
        <NumField label="Smoothness" value={effect.smoothness ?? 0.5} step={0.05} onChange={(v) => setExtra({ smoothness: Math.max(0, Math.min(1, v)) })} />
      </Row>
      <Row>
        <ShakeNum label="Horizontal" prop="x" value={params.x} step={0.5} currentFrame={currentFrame} effect={effect} onKf={keyframeParam} onChange={(v) => set({ x: v })} />
        <ShakeNum label="Vertical" prop="y" value={params.y} step={0.5} currentFrame={currentFrame} effect={effect} onKf={keyframeParam} onChange={(v) => set({ y: v })} />
      </Row>
      <Row>
        <ShakeNum label="Rotation" prop="rotation" value={params.rotation} step={0.001} currentFrame={currentFrame} effect={effect} onKf={keyframeParam} onChange={(v) => set({ rotation: v })} />
        <ShakeNum label="Scale" prop="scale" value={params.scale} step={0.01} currentFrame={currentFrame} effect={effect} onKf={keyframeParam} onChange={(v) => set({ scale: v })} />
      </Row>
      <Row>
        <ShakeNum label="Decay" prop="decay" value={params.decay} step={0.1} currentFrame={currentFrame} effect={effect} onKf={keyframeParam} onChange={(v) => set({ decay: Math.max(0, v) })} />
        <NumField label="Duration" value={effect.duration ?? 0} step={0.1} onChange={(v) => setExtra({ duration: Math.max(0, v) })} />
      </Row>
      <Row>
        <NumField label="Delay" value={effect.delay ?? 0} step={0.1} onChange={(v) => setExtra({ delay: Math.max(0, v) })} />
        <NumField label="Seed" value={params.seed} onChange={(v) => set({ seed: Math.max(0, Math.round(v)) })} />
      </Row>
      <div className="grid grid-cols-2 gap-1">
        <ToggleButton active={!!effect.loop} onClick={() => setExtra({ loop: !effect.loop })}>Loop</ToggleButton>
        <ToggleButton active={!!effect.reverse} onClick={() => setExtra({ reverse: !effect.reverse })}>Reverse</ToggleButton>
      </div>
      <Row>
        <SelectField label="Noise" value={effect.noiseType ?? "smooth"} options={["smooth", "perlin", "simplex", "jitter", "glitch"]} onChange={(v) => setExtra({ noiseType: v as ShakeEffect["noiseType"] })} />
        <SelectField label="Blend" value={effect.blendMode ?? "add"} options={["add", "replace", "multiply"]} onChange={(v) => setExtra({ blendMode: v as ShakeEffect["blendMode"] })} />
      </Row>
      <SelectField label="Space" value={effect.space ?? "layer"} options={["layer", "camera"]} onChange={(v) => setExtra({ space: v as ShakeEffect["space"] })} />
      <label className="block">
        <div className="text-[10px] text-muted-foreground mb-1">Easing</div>
        <select
          value={params.easing}
          onChange={(e) => set({ easing: e.target.value as EasingName })}
          className="w-full h-8 rounded-md border border-border bg-surface-2 px-2 text-xs outline-none focus:border-primary/60"
        >
          {["linear", "easeInQuad", "easeOutQuad", "easeInOutQuad", "easeOutCubic", "easeOutExpo", "easeOutElastic", "easeOutBounce"].map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </label>
      {effect.presetId && (
        <button
          onClick={() => {
            const preset = ShakeRegistry.get(effect.presetId ?? "");
            if (preset) onChange(patchFromShakeParams(preset.params, preset.id) as Partial<LayerEffect>);
          }}
          className="h-8 w-full rounded-md border border-border bg-surface-2 text-xs text-muted-foreground hover:text-foreground"
        >
          Reset to preset
        </button>
      )}
    </div>
  );
}

function ShakePresetButton({ active, name, description, onPreview, onRestore, onCommit }: {
  active: boolean;
  name: string;
  description?: string;
  onPreview: () => void;
  onRestore: () => void;
  onCommit: () => void;
}) {
  return (
    <button
      onMouseEnter={onPreview}
      onMouseLeave={onRestore}
      onClick={onCommit}
      className={cn(
        "relative rounded-md border px-2 py-1.5 text-left transition",
        active
          ? "border-primary bg-primary/20 text-foreground shadow-[0_0_12px_-6px_var(--primary-glow)]"
          : "border-border bg-surface-2 text-muted-foreground hover:border-primary/40 hover:text-foreground",
      )}
      title={description}
    >
      {active && <span className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r-full bg-primary" />}
      <div className="flex items-center gap-1">
        <span className="truncate text-[11px] font-medium">{name}</span>
        {active && (
          <span className="ml-auto rounded-sm bg-primary px-1 py-0.5 text-[8px] font-bold uppercase tracking-wider text-primary-foreground">
            On
          </span>
        )}
      </div>
    </button>
  );
}

function ShakeNum({ label, prop, value, step = 1, currentFrame, effect, onKf, onChange }: {
  label: string;
  prop: ShakeAnimatableProp;
  value: number;
  step?: number;
  currentFrame: number;
  effect: ShakeEffect;
  onKf: (prop: ShakeAnimatableProp, value: number) => void;
  onChange: (value: number) => void;
}) {
  const hasKeyframe = !!effect.keyframes?.[prop]?.some((kf) => kf.frame === currentFrame);
  return (
    <NumField
      label={label}
      value={value}
      step={step}
      kf={hasKeyframe}
      onKf={() => onKf(prop, value)}
      onChange={onChange}
    />
  );
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <div className="text-[10px] text-muted-foreground mb-1">{label}</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-8 rounded-md border border-border bg-surface-2 px-2 text-xs outline-none focus:border-primary/60"
      >
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function EffectRow({ effect, active, onSelect, onToggle, onRemove }: { effect: LayerEffect; active: boolean; onSelect: () => void; onToggle: () => void; onRemove: () => void }) {
  return (
    <div
      onClick={onSelect}
      className={cn(
        "flex items-center gap-2 rounded-md border bg-surface-2/40 px-2 py-1.5 cursor-pointer",
        active ? "border-primary/60" : "border-border",
      )}
    >
      <button onClick={(e) => { e.stopPropagation(); onToggle(); }} className="text-muted-foreground hover:text-foreground" title={effect.enabled ? "Disable" : "Enable"}>
        {effect.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
      </button>
      <span className="min-w-0 flex-1 truncate text-xs">{EFFECT_LABELS[effect.kind]}</span>
      <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="text-muted-foreground hover:text-destructive" title="Remove effect">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function Section({ title, children, trailing }: { title: string; children: React.ReactNode; trailing?: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{title}</div>
        {trailing}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-2">{children}</div>;
}

function KfDot({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={on ? "Remove keyframe at current frame" : "Add keyframe at current frame"}
      className={cn(
        "w-4 h-4 rounded-sm flex items-center justify-center transition",
        on ? "text-primary" : "text-muted-foreground/60 hover:text-foreground",
      )}
    >
      <Diamond className={cn("w-2.5 h-2.5", on && "fill-current drop-shadow-[0_0_4px_var(--primary-glow)]")} />
    </button>
  );
}

function NumField({ label, value, step = 1, onChange, kf, onKf, onFocus }: { label: string; value: number; step?: number; onChange: (v: number) => void; kf?: boolean; onKf?: () => void; onFocus?: () => void }) {
  return (
    <label className="block">
      <div className="text-[10px] text-muted-foreground mb-1 flex items-center justify-between">
        <span>{label}</span>
        {onKf && <KfDot on={!!kf} onClick={onKf} />}
      </div>
      <input
        type="number"
        value={Number.isFinite(value) ? Number(value.toFixed(2)) : 0}
        step={step}
        onFocus={onFocus}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className={cn(
          "w-full h-8 px-2 rounded-md bg-surface-2 border text-xs font-mono focus:outline-none focus:bg-surface-3",
          kf ? "border-primary/50 focus:border-primary" : "border-border focus:border-primary/60",
        )}
      />
    </label>
  );
}

function Slider({ value, min, max, step, onChange, onFocus, valueLabel }: { value: number; min: number; max: number; step: number; onChange: (v: number) => void; onFocus?: () => void; valueLabel?: string }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground">Value</span>
        <span className="font-mono">{valueLabel ?? `${Math.round(value * 100)}%`}</span>
      </div>
      <div className="relative h-1.5 rounded-full bg-surface-2 overflow-hidden">
        <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-accent" style={{ width: `${pct}%` }} />
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onFocus={onFocus}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-(--color-primary)"
      />
    </div>
  );
}

function AnchorGrid({ layer, onSet }: { layer: Layer; onSet: (x: number, y: number) => void }) {
  const points = [0, 0.5, 1];
  return (
    <div className="grid grid-cols-3 gap-1 p-1.5 rounded-md bg-surface-2 border border-border w-max">
      {points.flatMap((y) =>
        points.map((x) => {
          const active = Math.abs(layer.anchorX - x) < 0.01 && Math.abs(layer.anchorY - y) < 0.01;
          return (
            <button
              key={`${x}-${y}`}
              onClick={() => onSet(x, y)}
              className={cn(
                "w-4 h-4 rounded-sm border",
                active ? "bg-primary border-primary shadow-[0_0_8px_var(--primary-glow)]" : "bg-surface-3 border-border hover:border-primary/40",
              )}
            />
          );
        }),
      )}
    </div>
  );
}
