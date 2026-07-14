/**
 * Animation presets — the "one-click" library. Each preset defines
 * normalized tracks (t in [0,1]); at apply time we scale to a duration
 * (in frames) starting at the current playhead, and OFFSET values against
 * the layer's current static value so the animation lands back on the
 * layer's actual pose.
 *
 * Values are relative deltas for x/y/rotation and absolute multipliers
 * for scale, encoded so the "resting" pose value is always the layer's
 * current value.
 */

import type { AnimationPreset } from "@/types/animation";

export const ANIMATION_PRESETS: AnimationPreset[] = [
  {
    id: "pop-in",
    name: "Pop In",
    description: "Scales up from 0 with a back overshoot. Great for character reveals.",
    durationFrames: 20,
    tracks: {
      scaleX: [
        { t: 0, value: 0, easing: "easeOutBack" },
        { t: 1, value: 1, easing: "linear" },
      ],
      scaleY: [
        { t: 0, value: 0, easing: "easeOutBack" },
        { t: 1, value: 1, easing: "linear" },
      ],
      opacity: [
        { t: 0, value: 0, easing: "easeOutQuad" },
        { t: 0.4, value: 1, easing: "linear" },
      ],
    },
  },
  {
    id: "fade-in",
    name: "Fade In",
    description: "Smooth opacity 0 → 1.",
    durationFrames: 18,
    tracks: {
      opacity: [
        { t: 0, value: 0, easing: "easeOutQuad" },
        { t: 1, value: 1, easing: "linear" },
      ],
    },
  },
  {
    id: "slide-in-left",
    name: "Slide In ←",
    description: "Enters from the left with a soft ease-out.",
    durationFrames: 22,
    tracks: {
      x: [
        { t: 0, value: -320, easing: "easeOutCubic" },
        { t: 1, value: 0, easing: "linear" },
      ],
      opacity: [
        { t: 0, value: 0, easing: "easeOutQuad" },
        { t: 0.5, value: 1, easing: "linear" },
      ],
    },
  },
  {
    id: "shake",
    name: "Shake",
    description: "Fast horizontal jitter — perfect for impact frames.",
    durationFrames: 14,
    tracks: {
      x: [
        { t: 0, value: 0, easing: "linear" },
        { t: 0.15, value: -14, easing: "linear" },
        { t: 0.3, value: 12, easing: "linear" },
        { t: 0.45, value: -8, easing: "linear" },
        { t: 0.6, value: 6, easing: "linear" },
        { t: 0.8, value: -3, easing: "linear" },
        { t: 1, value: 0, easing: "linear" },
      ],
      rotation: [
        { t: 0, value: 0, easing: "linear" },
        { t: 0.25, value: -3, easing: "linear" },
        { t: 0.5, value: 3, easing: "linear" },
        { t: 0.75, value: -1.5, easing: "linear" },
        { t: 1, value: 0, easing: "linear" },
      ],
    },
  },
  {
    id: "bounce",
    name: "Bounce",
    description: "Drops in from above with a bounce landing.",
    durationFrames: 26,
    tracks: {
      y: [
        { t: 0, value: -260, easing: "easeOutBounce" },
        { t: 1, value: 0, easing: "linear" },
      ],
      opacity: [
        { t: 0, value: 0, easing: "easeOutQuad" },
        { t: 0.35, value: 1, easing: "linear" },
      ],
    },
  },
  {
    id: "spin",
    name: "Spin",
    description: "One full 360° rotation with ease in and out.",
    durationFrames: 30,
    tracks: {
      rotation: [
        { t: 0, value: 0, easing: "easeInOutCubic" },
        { t: 1, value: 360, easing: "linear" },
      ],
    },
  },
  {
    id: "pulse",
    name: "Pulse",
    description: "Rhythmic scale pulse — loops nicely.",
    durationFrames: 24,
    tracks: {
      scaleX: [
        { t: 0, value: 1, easing: "easeInOutQuad" },
        { t: 0.5, value: 1.12, easing: "easeInOutQuad" },
        { t: 1, value: 1, easing: "linear" },
      ],
      scaleY: [
        { t: 0, value: 1, easing: "easeInOutQuad" },
        { t: 0.5, value: 1.12, easing: "easeInOutQuad" },
        { t: 1, value: 1, easing: "linear" },
      ],
    },
  },
];
