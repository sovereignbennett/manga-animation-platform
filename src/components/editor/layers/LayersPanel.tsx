import { useLayersStore } from "@/store/layersStore";
import { useSelectionStore } from "@/store/selectionStore";
import { LayerRow } from "./LayerRow";
import { FiPlus } from "react-icons/fi";

export function LayersPanel() {
  const layers = useLayersStore((s) => s.layers);
  const add = useLayersStore((s) => s.add);
  const select = useSelectionStore((s) => s.set);

  return (
    <div className="flex h-full flex-col panel">
      <div className="flex items-center justify-between border-b border-border px-3 py-2 text-xs">
        <span className="font-semibold uppercase tracking-wider text-muted-foreground">Layers</span>
        <button
          onClick={() => { const l = add({ kind: "null", name: "New Layer" }); select("layer", l.id); }}
          className="rounded p-1 hover:bg-surface-strong"
          title="Add layer"
        >
          <FiPlus />
        </button>
      </div>
      <div className="flex-1 overflow-auto py-1">
        {layers.map((l) => <LayerRow key={l.id} layer={l} />)}
      </div>
    </div>
  );
}
