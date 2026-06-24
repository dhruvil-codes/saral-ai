"use client";

import { useEffect } from "react";

export default function ScrollObserver() {
  useEffect(() => {
    // 1. Scroll reveal animation for elements
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: "0px 0px -40px 0px",
      }
    );

    const revealElements = document.querySelectorAll(".reveal, .reveal-stagger");
    revealElements.forEach((el) => revealObserver.observe(el));

    // 2. Count-up animations for Stats Bar metrics
    const counterObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const targetEl = entry.target as HTMLElement;
            if (targetEl.dataset.animated === "true") return;

            targetEl.dataset.animated = "true";
            
            const targetStr = targetEl.dataset.target || "0";
            const isPercent = targetStr.includes("%");
            const isMultiplier = targetStr.includes("x");
            const isUptime = targetStr.includes("/");
            
            // Extract raw number to animate
            let targetValue = 0;
            let suffix = "";
            const prefix = "";

            if (isPercent) {
              targetValue = parseInt(targetStr.replace("%", ""), 10);
              suffix = "%";
            } else if (isMultiplier) {
              targetValue = parseInt(targetStr.replace("x", ""), 10);
              suffix = "x";
            } else if (isUptime) {
              // Specialized handling for uptime or response e.g., "24/7"
              targetEl.textContent = targetStr;
              counterObserver.unobserve(targetEl);
              return;
            } else {
              targetValue = parseInt(targetStr, 10);
            }

            const duration = 2000; // Animate over 2 seconds
            const startTime = performance.now();

            const animateValue = (currentTime: number) => {
              const elapsed = currentTime - startTime;
              const progress = Math.min(elapsed / duration, 1);
              
              // Easing out cubic for smooth slowing at the end
              const easeProgress = 1 - Math.pow(1 - progress, 3);
              const currentValue = Math.floor(easeProgress * targetValue);

              targetEl.textContent = `${prefix}${currentValue}${suffix}`;

              if (progress < 1) {
                requestAnimationFrame(animateValue);
              } else {
                targetEl.textContent = targetStr;
              }
            };

            requestAnimationFrame(animateValue);
            counterObserver.unobserve(targetEl);
          }
        });
      },
      {
        threshold: 0.1,
      }
    );

    const counterElements = document.querySelectorAll("[data-target]");
    counterElements.forEach((el) => counterObserver.observe(el));

    // 3. Sticky Nav scroll transition class toggle
    const handleScroll = () => {
      const nav = document.getElementById("main-nav");
      if (nav) {
        if (window.scrollY > 10) {
          nav.classList.add("scrolled");
        } else {
          nav.classList.remove("scrolled");
        }
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Check scroll state on mount

    return () => {
      revealObserver.disconnect();
      counterObserver.disconnect();
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return null;
}
