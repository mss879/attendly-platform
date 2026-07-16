// Client-side animation guard.
//
// Entrance/reveal animations here are built with gsap.from(...), which
// hides an element first and reveals it as the tween plays. GSAP's ticker
// (requestAnimationFrame) sleeps while the page is hidden — a background
// tab, a prerender, an offscreen preview — so a tween that starts then
// would strand content in its hidden state. This helper defers the whole
// animation setup until the page is actually visible; until then the
// markup simply renders in its natural, fully visible state.

export function runWhenPageVisible(setup: () => () => void): () => void {
  if (document.visibilityState === "visible") {
    return setup();
  }

  let cleanup: (() => void) | null = null;
  const onVisible = () => {
    if (document.visibilityState !== "visible") return;
    document.removeEventListener("visibilitychange", onVisible);
    cleanup = setup();
  };
  document.addEventListener("visibilitychange", onVisible);

  return () => {
    document.removeEventListener("visibilitychange", onVisible);
    cleanup?.();
  };
}
