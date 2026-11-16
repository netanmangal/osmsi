import { useEffect, useRef } from "react";
import Preloader from "@/components/Preloader";
import Nav from "@/components/Nav";
import Parachute from "@/components/deco/Parachute";
import Hero from "@/components/Hero";
import Marquee from "@/components/Marquee";
import Partners from "@/components/Partners";
import Statement from "@/components/Statement";
import Problem from "@/components/Problem";
import Dimensions from "@/components/Dimensions";
import Method from "@/components/Method";
import SafetyCard from "@/components/SafetyCard";
import Leaderboard from "@/components/Leaderboard";
import Evidence from "@/components/Evidence";
import Contribute from "@/components/Contribute";
import FinalCTA from "@/components/FinalCTA";
import Footer from "@/components/Footer";
import { startLenis, initReveals, ScrollTrigger } from "@/lib/anim";
import { ResultsProvider } from "@/lib/results";

const BAND_THEME: Record<string, string> = {
  paper: "#f5efe2",
  blueprint: "#e9edf6",
  void: "#14100c",
};

export default function App() {
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    startLenis();
    const cleanupReveals = mainRef.current ? initReveals(mainRef.current) : () => {};

    /* browser chrome + fixed chrome follow the page bands */
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const bandObs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const band = (e.target as HTMLElement).dataset.band ?? "paper";
            if (meta) meta.content = BAND_THEME[band];
            document.documentElement.dataset.band = band;
          }
        }
      },
      { rootMargin: "-8% 0px -80% 0px" }
    );
    document
      .querySelectorAll("main > section, footer, [data-band]")
      .forEach((el) => bandObs.observe(el));

    /* metrics settle after fonts */
    document.fonts.ready.then(() => ScrollTrigger.refresh());

    return () => {
      cleanupReveals();
      bandObs.disconnect();
    };
  }, []);

  return (
    <ResultsProvider>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Preloader />
      <div className="grain" aria-hidden="true" />
      <Parachute />
      <Nav />
      <main id="main" ref={mainRef}>
        <Hero />
        <Partners />
        <Marquee />
        <Statement note="why OSMSI exists">
          Capability has a leaderboard. <em className="text-flag">Safety didn't.</em>
        </Statement>
        <Problem />
        <Dimensions />
        <Statement note="what the card replaces">
          Trust the pipeline, <em className="text-warn">not the press release.</em>
        </Statement>
        <Method />
        <SafetyCard />
        <Leaderboard />
        <Evidence />
        <Statement note="the position">
          Open evals for open weights. Anything less is{" "}
          <em className="text-cobalt">trust by vibes.</em>
        </Statement>
        <Contribute />
        <FinalCTA />
      </main>
      <Footer />
    </ResultsProvider>
  );
}
