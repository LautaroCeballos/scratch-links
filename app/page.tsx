import ScratchWidget from "./widget";
import EmbedInfo from "./embed-info";

export default function Home() {
  return (
    <main className="page">
      <div className="page__cols">
        <ScratchWidget />
        <EmbedInfo />
      </div>
    </main>
  );
}
