import { useEffect } from "react";

export function useScrollReveal() {
  useEffect(() => {
    const seen = new WeakSet<Element>();

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add("in-view");
        });
      },
      { threshold: 0.05 },
    );

    const watchNew = () => {
      document.querySelectorAll("[data-reveal]").forEach((el) => {
        if (!seen.has(el)) {
          seen.add(el);
          obs.observe(el);
        }
      });
    };

    watchNew();

    // Observa elementos que se agregan al DOM después (secciones condicionales, async)
    const mut = new MutationObserver(watchNew);
    mut.observe(document.body, { childList: true, subtree: true });

    return () => {
      obs.disconnect();
      mut.disconnect();
    };
  }, []);
}
