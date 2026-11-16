import { CONTACT_URL } from "@/lib/data";
import { ButtonLink } from "@/components/ui/button";
import { scrollToHash } from "@/lib/anim";

const LINKS = [
  { label: "The method", href: "#method" },
  { label: "Safety cards", href: "#cards" },
  { label: "The index", href: "#index" },
  { label: "Contribute", href: "#contribute" },
];

export default function Footer() {
  return (
    <footer data-band="void" className="band-void border-t border-(--line-cream)">
      <div className="grid gap-10 px-(--pad-x) py-12 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <p className="font-display text-[1.5rem] font-[600]">OSMSI</p>
          <p className="text-cream/62 mt-3 max-w-[38ch] text-[0.95rem] leading-[1.65]">
            Open Source Model Safety Index. An experimental evaluation framework for
            open-weight foundation models. A Disobedient Geometry project.
          </p>
        </div>

        <nav aria-label="Footer" className="flex flex-col gap-2.5">
          <p className="mono-label text-cream/45 mb-2">document</p>
          {LINKS.map(({ label, href }) => (
            <a
              key={href}
              href={href}
              onClick={(e) => (e.preventDefault(), scrollToHash(href))}
              className="text-cream/78 hover:text-cream w-fit text-[0.95rem] no-underline transition-colors"
            >
              <span className="text-cream/40 mr-2">→</span>
              {label}
            </a>
          ))}
        </nav>

        <div className="flex flex-col items-start gap-4">
          <p className="mono-label text-cream/45 mb-1">contact</p>
          <ButtonLink variant="cream" href={CONTACT_URL} target="_blank" rel="noreferrer">
            Write to us
          </ButtonLink>
        </div>
      </div>

    </footer>
  );
}
