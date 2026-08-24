import { useEffect, useRef, useState } from "react";
import { NAV_LINKS } from "@/lib/data";
import { scrollToHash, gsap, prefersReduced } from "@/lib/anim";
import { cn } from "@/lib/utils";

function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true" fill="none">
      <polygon
        points="32,12 49.3,22 49.3,42 32,52 14.7,42 14.7,22"
        stroke="currentColor"
        strokeWidth="4"
      />
      <line x1="32" y1="2" x2="32" y2="10" stroke="currentColor" strokeWidth="4" />
      <line x1="32" y1="54" x2="32" y2="62" stroke="currentColor" strokeWidth="4" />
      <line x1="2" y1="32" x2="10" y2="32" stroke="currentColor" strokeWidth="4" />
      <line x1="54" y1="32" x2="62" y2="32" stroke="currentColor" strokeWidth="4" />
      <circle cx="32" cy="32" r="3.6" fill="currentColor" />
    </svg>
  );
}

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* scroll-spy: highlight the section currently in view */
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(`#${e.target.id}`);
      },
      { rootMargin: "-38% 0px -55% 0px" }
    );
    NAV_LINKS.forEach(({ href }) => {
      const el = document.querySelector(href);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (open && panelRef.current && !prefersReduced()) {
      gsap.from(panelRef.current.querySelectorAll("a"), {
        y: 26,
        opacity: 0,
        stagger: 0.05,
        duration: 0.5,
        ease: "power3.out",
      });
    }
    document.documentElement.style.overflow = open ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  const go = (href: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    setOpen(false);
    scrollToHash(href);
  };

  return (
    <>
      <header
        className={cn(
        "site-nav fixed inset-x-0 top-0 z-(--z-nav) transition-[background-color,border-color,backdrop-filter,color] duration-300",
        scrolled
          ? "border-b border-(--line) bg-paper/85 backdrop-blur-md"
          : "border-b border-transparent"
      )}
    >
      <nav
        aria-label="Primary"
        className="flex h-16 items-center justify-between px-(--pad-x)"
      >
        <a
          href="#top"
          onClick={go("#top")}
          className="flex items-center gap-2.5 text-current no-underline"
        >
          <Mark className="text-cobalt size-6" />
          <span className="font-display text-[1.18rem] font-semibold tracking-tight">OSMSI</span>
          <span className="mono-label mt-0.5 hidden text-[0.6rem] normal-case sm:block">
            · index β
          </span>
        </a>

        <div className="hidden items-center gap-7 lg:flex">
          {NAV_LINKS.map(({ label, href }) => (
            <a
              key={href}
              href={href}
              onClick={go(href)}
              className={cn(
                "mono-label no-underline transition-colors duration-200 hover:text-current",
                active === href && "text-cobalt hover:text-cobalt"
              )}
            >
              {label}
            </a>
          ))}
          <a
            href="#index"
            onClick={go("#index")}
            className="press press-wash text-ink rounded-lg border border-(--line-strong) px-4 py-2 font-mono text-[0.72rem] font-medium tracking-[0.14em] uppercase no-underline hover:border-current"
          >
            View the index
          </a>
        </div>

        <button
          type="button"
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
          className="flex size-11 cursor-pointer flex-col items-center justify-center gap-[5px] text-current lg:hidden"
        >
          <span
            className={cn(
              "h-px w-6 bg-current transition-transform duration-300",
              open && "translate-y-[3px] rotate-45"
            )}
          />
          <span
            className={cn(
              "h-px w-6 bg-current transition-transform duration-300",
              open && "-translate-y-[3px] -rotate-45"
            )}
          />
        </button>
      </nav>
      </header>

      {/* the panel lives OUTSIDE the header: once the header carries a
          backdrop-filter it becomes the containing block for fixed
          children, and this would size itself to a 64px bar */}
      {open && (
        <div
          ref={panelRef}
          className="bg-paper fixed inset-0 top-16 z-(--z-nav) flex flex-col gap-1 overflow-y-auto border-t border-(--line) px-(--pad-x) py-10 lg:hidden"
        >
          {NAV_LINKS.map(({ label, href }, i) => (
            <a
              key={href}
              href={href}
              onClick={go(href)}
              className="font-display text-ink border-b border-(--line) py-4 text-3xl font-medium no-underline"
            >
              <span className="mono-label text-cobalt mr-4">{String(i + 1).padStart(2, "0")}</span>
              {label}
            </a>
          ))}
          <a
            href="https://mail.google.com/mail/?view=cm&fs=1&to=netan%40disobedientgeometry.com&su=OSMSI"
            target="_blank"
            rel="noreferrer"
            className="mono-label mt-8 no-underline"
          >
            netan@disobedientgeometry.com
          </a>
        </div>
      )}
    </>
  );
}
