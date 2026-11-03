/* Золотой ковш V2 — эффекты прокрутки. Не обращается к Supabase и не меняет контент. */
(() => {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const header = document.querySelector(".topbar");
  const progress = document.createElement("div");
  progress.className = "scroll-progress";
  progress.innerHTML = "<span></span>";
  document.body.appendChild(progress);
  const bar = progress.firstElementChild;
  const topButton = document.createElement("button");
  topButton.className = "back-to-top";
  topButton.type = "button";
  topButton.setAttribute("aria-label", "Наверх");
  topButton.textContent = "↑";
  document.body.appendChild(topButton);
  topButton.addEventListener("click", () => window.scrollTo({top:0,behavior:reduce?"auto":"smooth"}));

  let ticking = false;
  const update = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const y = window.scrollY || 0;
    bar.style.width = (max > 0 ? Math.min(100, y / max * 100) : 0) + "%";
    header?.classList.toggle("scrolled", y > 40);
    topButton.classList.toggle("show", y > 650);
    ticking = false;
  };
  window.addEventListener("scroll", () => {
    if (!ticking) { requestAnimationFrame(update); ticking = true; }
  }, {passive:true});
  window.addEventListener("resize", update);
  update();

  const revealItems = [...document.querySelectorAll(".reveal")];
  document.querySelectorAll(".service-grid,.gallery-grid").forEach(group => {
    [...group.children].forEach((item, index) => {
      item.classList.add("reveal");
      item.style.setProperty("--reveal-delay", Math.min(index * 100, 350) + "ms");
      revealItems.push(item);
    });
  });
  if (reduce || !("IntersectionObserver" in window)) {
    revealItems.forEach(item => item.classList.add("visible"));
  } else {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    }, {threshold:0.12,rootMargin:"0px 0px -35px 0px"});
    revealItems.forEach(item => observer.observe(item));
  }

  if (!reduce && window.matchMedia("(min-width: 900px)").matches) {
    const hero = document.querySelector(".hero");
    const bg = hero && getComputedStyle(hero, "::before");
    if (hero && bg) {
      window.addEventListener("scroll", () => {
        const y = window.scrollY;
        if (y < hero.offsetHeight) hero.style.setProperty("--hero-scroll", y * 0.12 + "px");
      }, {passive:true});
    }
  }
})();
