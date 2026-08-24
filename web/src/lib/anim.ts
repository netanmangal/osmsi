import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { Flip } from "gsap/Flip";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger, SplitText, Flip);

export { gsap, ScrollTrigger, SplitText, Flip };

export const EASE = "cubic-bezier(0.22, 1, 0.36, 1)"; // css twin of house ease
export const easeOut = "power3.out";
export const easeEmph = "expo.out";

export const prefersReduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let lenis: Lenis | null = null;

/** Smooth scroll, driven by the gsap ticker so ScrollTrigger stays in sync. */
export function startLenis() {
  if (lenis || prefersReduced()) return null;
  lenis = new Lenis({ lerp: 0.115, wheelMultiplier: 1 });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add(tickLenis);
  gsap.ticker.lagSmoothing(0);
  return lenis;
}

function tickLenis(time: number) {
  lenis?.raf(time * 1000);
}

export function getLenis() {
  return lenis;
}

export function scrollToHash(hash: string) {
  const el = document.querySelector(hash);
  if (!el) return;
  if (lenis) lenis.scrollTo(el as HTMLElement, { offset: -72, duration: 1.1 });
  else el.scrollIntoView({ behavior: prefersReduced() ? "auto" : "smooth" });
}

/**
 * Generic scroll reveals for [data-reveal] elements inside `scope`.
 *   data-reveal        → rise + fade
 *   data-reveal=words  → SplitText word stagger (display text)
 * Content is fully visible without JS; GSAP only borrows the start state.
 */
export function initReveals(scope: HTMLElement) {
  if (prefersReduced()) return () => {};
  const ctx = gsap.context(() => {
    scope.querySelectorAll<HTMLElement>("[data-reveal='words']").forEach((el) => {
      const split = SplitText.create(el, { type: "words", wordsClass: "will-change-transform" });
      gsap.from(split.words, {
        yPercent: 108,
        opacity: 0,
        duration: 0.9,
        ease: easeEmph,
        stagger: 0.045,
        scrollTrigger: { trigger: el, start: "top 86%", once: true },
      });
    });
    scope.querySelectorAll<HTMLElement>("[data-reveal='']").forEach((el) => {
      gsap.from(el, {
        y: 26,
        opacity: 0,
        duration: 0.85,
        ease: easeOut,
        delay: Number(el.dataset.delay ?? 0),
        scrollTrigger: { trigger: el, start: "top 88%", once: true },
      });
    });
  }, scope);
  return () => ctx.revert();
}
