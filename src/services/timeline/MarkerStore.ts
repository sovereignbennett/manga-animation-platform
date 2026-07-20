import type { Marker } from "@/types";
import { uid } from "@/utils/id";

/** Pure, in-memory marker store with subscribe. */
export class MarkerStore {
  private markers: Marker[] = [];
  private listeners = new Set<(m: Marker[]) => void>();
  list(): readonly Marker[] { return this.markers; }
  add(time: number, label?: string, color?: string): Marker {
    const m: Marker = { id: uid("mk"), time, label, color };
    this.markers = [...this.markers, m].sort((a, b) => a.time - b.time);
    this.emit();
    return m;
  }
  remove(id: string): void { this.markers = this.markers.filter((m) => m.id !== id); this.emit(); }
  clear(): void { this.markers = []; this.emit(); }
  subscribe(l: (m: Marker[]) => void): () => void { this.listeners.add(l); return () => this.listeners.delete(l); }
  private emit(): void { for (const l of this.listeners) l(this.markers); }
}
