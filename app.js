function updateDisplayAspect() {
  const width = window.screen?.width || window.innerWidth;
  const height = window.screen?.height || window.innerHeight;

  if (!width || !height) return;

  document.documentElement.style.setProperty(
    "--display-aspect",
    String(width / height)
  );
}

updateDisplayAspect();
window.addEventListener("resize", updateDisplayAspect);
window.addEventListener("orientationchange", updateDisplayAspect);
