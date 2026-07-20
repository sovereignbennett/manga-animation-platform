import type { Clip, ID, Marker, TimeRange } from "@/types";

export interface Track {
  id: ID;
  layerId: ID;
  kind: "video" | "audio" | "text" | "fx";
  color: string;
  height: number;
  muted?: boolean;
  soloed?: boolean;
  locked?: boolean;
}

export interface TimelineSnapshot {
  duration: number;   // seconds
  fps: number;
  zoom: number;       // pixels per second
  scroll: number;     // pixels
  tracks: Track[];
  clips: Clip[];
  markers: Marker[];
}

export type { Clip, Marker, TimeRange };
