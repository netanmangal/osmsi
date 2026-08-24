import { useEffect, useRef } from "react";
import { PARTNERS } from "@/lib/data";
import { gsap, prefersReduced } from "@/lib/anim";

/* One logo sliding past on a loop reads as a bug, not a marquee. Below this
   count the strip sits still and centred; at or above it the loop takes over,
   so adding partners later is a data change and nothing else. */
const MARQUEE_FROM = 3;

/** the mark, masked so it takes the band's ink instead of shipping its own black */
function Mark({ name, src, aspect }: { name: string; src: string; aspect: number }) {
  return (
    <span
      role="img"
      aria-label={name}
      className="partner-mark h-[26px] shrink-0 sm:h-[30px]"
      style={{
        aspectRatio: String(aspect),
        WebkitMaskImage: `url("${src}")`,
        maskImage: `url("${src}")`,
      }}
    />
  );
}

function Logo({ name, href, src, aspect }: (typeof PARTNERS)[number]) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-ink-dim hover:text-ink inline-flex transition-colors duration-200"
    >
      <Mark name={name} src={src} aspect={aspect} />
    </a>
  );
}

export default function Partners() {
  const track = useRef<HTMLDivElement>(null);
  const looping = PARTNERS.length >= MARQUEE_FROM;

  useEffect(() => {
    if (!looping || prefersReduced() || !track.current) return;
    /* left to right: start a full strip behind and travel forward to zero */
    const tween = gsap.fromTo(
      track.current,
      { xPercent: -50 },
      { xPercent: 0, duration: 30, ease: "none", repeat: -1 }
    );
    return () => {
      tween.kill();
    };
  }, [looping]);

  const strip = (clone: boolean) => (
    <div aria-hidden={clone || undefined} className="flex shrink-0 items-center gap-14 pr-14">
      {PARTNERS.map((p) => (
        <Logo key={p.name + (clone ? "-b" : "")} {...p} />
      ))}
    </div>
  );

  return (
    <section aria-label="Partners" className="border-t border-(--line) px-(--pad-x) py-7">
      <p className="mono-label mb-5 text-center text-[0.62rem]">Partners & Affiliations</p>

      {looping ? (
        <div className="marquee-mask overflow-hidden">
          <div ref={track} className="flex w-max">
            {strip(false)}
            {strip(true)}
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-center gap-x-14 gap-y-6">
          {PARTNERS.map((p) => (
            <Logo key={p.name} {...p} />
          ))}
        </div>
      )}
    </section>
  );
}
