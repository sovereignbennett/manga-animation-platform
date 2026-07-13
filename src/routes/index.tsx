import { createFileRoute } from "@tanstack/react-router";
import { TopToolbar } from "@/components/editor/TopToolbar";
import { LeftSidebar } from "@/components/editor/LeftSidebar";
import { RightInspector } from "@/components/editor/RightInspector";
import { BottomTimeline } from "@/components/editor/BottomTimeline";
import { CanvasStage } from "@/components/editor/CanvasStage";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MotionCut Studio — AI Animation Editor for Anime & Edits" },
      {
        name: "description",
        content:
          "MotionCut Studio is an AI-assisted animation editor for anime, manga and TikTok edit creators. Cut characters, rig layers and animate — all in one premium canvas.",
      },
      { property: "og:title", content: "MotionCut Studio" },
      {
        property: "og:description",
        content: "AI-assisted animation editor for anime and edit creators.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EditorPage,
});

function EditorPage() {
  useKeyboardShortcuts();
  return (
    <div className="flex flex-col h-screen w-screen bg-background text-foreground">
      <TopToolbar />
      <div className="flex-1 flex min-h-0">
        <LeftSidebar />
        <main className="flex-1 flex flex-col min-w-0">
          <CanvasStage />
          <BottomTimeline />
        </main>
        <RightInspector />
      </div>
    </div>
  );
}
