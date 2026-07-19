/**
 * Helpers to create and mutate text layers on top of the existing image-layer
 * pipeline. Text layers are `kind: "image"` with a `text` prop attached so
 * Pixi, effects, export and mask tools keep working unchanged.
 */
import { useEditor } from "@/store/editorStore";
import { renderText, type TextProps } from "./renderText";

export function createTextLayer(
  x: number,
  y: number,
  props: TextProps,
): string {
  const { src, width, height } = renderText(props);
  const s = useEditor.getState();
  s.addImageLayer(
    `Text — ${props.content.slice(0, 24) || "Text"}`,
    src,
    width,
    height,
  );

  // addImageLayer selects the new layer; patch it with position + text meta.
  const id = useEditor.getState().selectedIds[0];
  if (id) {
    useEditor.setState((st) => ({
      project: {
        ...st.project,
        layers: st.project.layers.map((l) =>
          l.id === id ? { ...l, x, y, text: props } : l,
        ),
        updatedAt: Date.now(),
      },
    }));
  }
  return id ?? "";
}

export function updateTextLayer(id: string, patch: Partial<TextProps>) {
  const s = useEditor.getState();
  const layer = s.project.layers.find((l) => l.id === id);
  if (!layer || !layer.text) return;
  const next: TextProps = { ...layer.text, ...patch };
  const { src, width, height } = renderText(next);
  s.pushHistory();
  s.updateLayer(id, { text: next, src, width, height });
}
