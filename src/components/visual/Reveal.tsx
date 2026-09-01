"use client";

import { useEffect, useRef, useState } from "react";

type Motion = "up" | "in" | "scale" | "slide";

const ANIMATION: Record<Motion, string> = {
  up: "animate-fade-up",
  in: "animate-fade-in",
  scale: "animate-scale-in",
  slide: "animate-slide-in",
};

/**
 * Plays an entrance animation the first time the element scrolls into view.
 *
 * The hard requirement here is that content must NEVER stay hidden. An
 * IntersectionObserver can simply not fire — a tab that was hidden when the
 * component mounted, a bfcache restore, a prerender — and "invisible
 * forever" is a far worse outcome than "appeared without animating". So
 * there are three independent ways to become visible:
 *
 *   1. already in the viewport at mount  -> show immediately
 *   2. the observer fires                -> show (the normal path)
 *   3. a passive scroll/resize check     -> show (observer backstop)
 *
 * And with JavaScript off, the `reveal-pending` class is neutralised by a
 * <noscript> rule in the locale layout, so the content still renders.
 */
export function Reveal({
  children,
  motion = "up",
  delay = 0,
  className = "",
  as: Tag = "div",
}: {
  children: React.ReactNode;
  motion?: Motion;
  /** Milliseconds, for staggering siblings. */
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li" | "span";
}) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    let done = false;

    function inViewNow(el: HTMLElement) {
      const rect = el.getBoundingClientRect();
      return rect.top < window.innerHeight && rect.bottom > 0;
    }

    function reveal() {
      if (done) return;
      done = true;
      setShown(true);
      observer?.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    }

    function onScroll() {
      if (ref.current && inViewNow(ref.current)) reveal();
    }

    // 1. Already visible — no reason to wait for anything.
    if (inViewNow(node)) {
      setShown(true);
      return;
    }

    // 2. The normal path.
    const observer =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(
            ([entry]) => {
              if (entry.isIntersecting) reveal();
            },
            // Start slightly before the element reaches the fold, so the
            // animation is already underway when it becomes visible.
            { rootMargin: "0px 0px -10% 0px", threshold: 0.05 }
          );

    if (observer) {
      observer.observe(node);
    } else {
      reveal();
      return;
    }

    // 3. Backstop for the cases where the observer stays silent.
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    // 4. Last resort. If nothing above has fired by now the page is not
    //    being rendered normally (a hidden tab, a throttled renderer), and
    //    the animation is not worth the risk of content that never
    //    appears. Reveal unconditionally and drop the effect.
    const failsafe = window.setTimeout(reveal, 2500);

    return () => {
      window.clearTimeout(failsafe);
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <Tag
      ref={ref as React.Ref<never>}
      className={`${shown ? ANIMATION[motion] : "reveal-pending opacity-0"} ${className}`}
      style={shown && delay ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
