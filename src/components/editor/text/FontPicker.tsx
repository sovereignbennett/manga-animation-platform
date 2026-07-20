import { useTextStore } from "@/store/textStore";
import { FontRegistry } from "@/services/text";

export function FontPicker({ blockId }: { blockId: string }) {
  const block = useTextStore((s) => s.blocks.find((b) => b.id === blockId));
  const updateStyle = useTextStore((s) => s.updateStyle);
  const fonts = FontRegistry.list();
  if (!block) return null;
  return (
    <select
      value={block.style.fontFamily}
      onChange={(e) => updateStyle(blockId, { fontFamily: e.target.value })}
      className="surface w-full bg-transparent px-2 py-1 text-xs"
    >
      {fonts.map((f) => <option key={f.family} value={f.family}>{f.displayName}</option>)}
    </select>
  );
}
