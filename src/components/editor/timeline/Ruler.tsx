export function Ruler({ duration, zoom }: { duration: number; zoom: number }) {
  const step = zoom < 30 ? 5 : zoom < 80 ? 2 : 1;
  const ticks: number[] = [];
  for (let t = 0; t <= duration; t += step) ticks.push(t);
  return (
    <div className="relative h-6 border-b border-border">
      {ticks.map((t) => (
        <div key={t} className="absolute top-0 h-full" style={{ left: t * zoom }}>
          <div className="h-2 w-px" style={{ backgroundColor: "var(--color-timeline-grid)" }} />
          <div className="pl-1 text-[10px] text-muted-foreground">{t}s</div>
        </div>
      ))}
    </div>
  );
}
