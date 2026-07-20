import { FiEye, FiEyeOff, FiLock, FiUnlock, FiFilm, FiMusic, FiType, FiBox, FiFolder, FiVideo, FiTarget, FiSliders } from "react-icons/fi";
import type { Layer, LayerKind } from "@/types";
import { useLayersStore } from "@/store/layersStore";
import { useSelectionStore } from "@/store/selectionStore";
import { cn } from "@/lib/utils";
const iconFor: Record<LayerKind, React.ReactNode> = {
  video: <FiFilm />, audio: <FiMusic />, text: <FiType />, image: <FiBox />,
  null: <FiTarget />, adjustment: <FiSliders />, camera: <FiVideo />, folder: <FiFolder />,
};

export function LayerRow({ layer }: { layer: Layer }) {
  const toggleVisible = useLayersStore((s) => s.toggleVisible);
  const toggleLocked = useLayersStore((s) => s.toggleLocked);
  const selectedId = useSelectionStore((s) => (s.kind === "layer" ? s.id : null));
  const selectLayer = useLayersStore((s) => s.select);
  const setSel = useSelectionStore((s) => s.set);
  const selected = selectedId === layer.id;

  return (
    <div
      onClick={() => { selectLayer(layer.id); setSel("layer", layer.id); }}
      className={cn(
        "group flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm",
        selected ? "bg-surface-strong" : "hover:bg-surface",
      )}
    >
      <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: layer.color }} />
      <span className="text-muted-foreground">{iconFor[layer.kind]}</span>
      <span className="flex-1 truncate">{layer.name}</span>
      <button onClick={(e) => { e.stopPropagation(); toggleVisible(layer.id); }} className="opacity-60 hover:opacity-100">
        {layer.visible ? <FiEye /> : <FiEyeOff />}
      </button>
      <button onClick={(e) => { e.stopPropagation(); toggleLocked(layer.id); }} className="opacity-60 hover:opacity-100">
        {layer.locked ? <FiLock /> : <FiUnlock />}
      </button>
    </div>
  );
}
