import type { ID } from "@/types";
import { useLayersStore } from "@/store/layersStore";

/** Simple dropdown for choosing a parent layer (null = unparented). */
export function ParentPicker({ layerId }: { layerId: ID }) {
  const layers = useLayersStore((s) => s.layers);
  const setParent = useLayersStore((s) => s.setParent);
  const current = layers.find((l) => l.id === layerId);
  if (!current) return null;
  return (
    <select
      value={current.parentId ?? ""}
      onChange={(e) => setParent(layerId, e.target.value || null)}
      className="surface w-full bg-transparent px-2 py-1 text-xs"
    >
      <option value="">— none —</option>
      {layers.filter((l) => l.id !== layerId).map((l) => (
        <option key={l.id} value={l.id}>{l.name}</option>
      ))}
    </select>
  );
}
