import { useSelectionStore } from "@/store/selectionStore";
import { ShakeInspector } from "@/components/editor/shakes";
import { TransitionInspector } from "@/components/editor";
import { EffectInspector } from "@/components/editor/effects";
import { TextInspector } from "@/components/editor/text";
import { BrushInspector } from "@/components/editor/brush";
import { AudioInspector } from "@/components/editor/audio";
import { ParentPicker } from "@/components/editor/layers";

/**
 * InspectorHost holds no per-feature logic. It only decides which
 * feature's Inspector to mount based on `selectionStore.kind`.
 * Adding a new feature = add one branch here.
 */
export function InspectorHost() {
  const kind = useSelectionStore((s) => s.kind);
  const id = useSelectionStore((s) => s.id);

  return (
    <div className="flex h-full flex-col panel overflow-hidden">
      <div className="border-b border-border px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Inspector — {kind ?? "empty"}
      </div>
      <div className="flex-1 overflow-auto">
        {kind === "shake" && <ShakeInspector />}
        {kind === "transition" && <TransitionInspector />}
        {kind === "effect" && <EffectInspector />}
        {kind === "text" && <TextInspector />}
        {kind === "brush" && <BrushInspector />}
        {kind === "audio" && <AudioInspector />}
        {kind === "layer" && id && (
          <div className="flex flex-col gap-2 p-3">
            <div className="text-xs font-semibold">Layer</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Parent</div>
            <ParentPicker layerId={id} />
          </div>
        )}
        {kind === "clip" && (
          <div className="p-3 text-xs text-muted-foreground">Clip selected — drag edges to trim.</div>
        )}
        {!kind && <div className="p-3 text-xs text-muted-foreground">Select something.</div>}
      </div>
    </div>
  );
}
