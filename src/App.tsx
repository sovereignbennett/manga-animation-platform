import { TopToolbar } from "@/components/editor/TopToolbar";
import { LeftSidebar } from "@/components/editor/LeftSidebar";
import { CanvasStage } from "@/components/editor/CanvasStage";
import { RightInspector } from "@/components/editor/RightInspector";
import { BottomTimeline } from "@/components/editor/BottomTimeline";

export default function App() {
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <TopToolbar />

      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar />

        <main className="flex-1 overflow-hidden">
          <CanvasStage />
        </main>

        <RightInspector />
      </div>

      <BottomTimeline />
    </div>
  );
}