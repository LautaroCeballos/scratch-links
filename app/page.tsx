import { Suspense } from "react";
import ScratchWidget from "./widget";
import EmbedInfo from "./embed-info";

function WidgetFallback() {
  return (
    <main className="widget">
      <div className="widget__card">
        <div className="widget__empty">Cargando widget…</div>
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <>
      <Suspense fallback={<WidgetFallback />}>
        <ScratchWidget />
      </Suspense>
      <EmbedInfo />
    </>
  );
}
