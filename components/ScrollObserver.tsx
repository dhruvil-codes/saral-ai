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
            
            // Check for direct bypass e.g. "24/7"
            if (targetStr.includes("/")) {
              targetEl.textContent = targetStr;
              counterObserver.unobserve(targetEl);
              return;
            }

            // Custom configuration attributes
            const prefix = targetEl.dataset.prefix || "";
            const suffix = targetEl.dataset.suffix || "";
            const decimals = parseInt(targetEl.dataset.decimals || "0", 10);
            const finalText = targetEl.dataset.finalText || "";
            
            let startVal = parseFloat(targetEl.dataset.start || "0");
            let targetVal = 0;
            let displaySuffix = suffix;
            let displayPrefix = prefix;

            // Fallback parsing for legacy targets (e.g. "98%", "5x")
            if (!targetEl.dataset.prefix && !targetEl.dataset.suffix && !targetEl.dataset.decimals && !targetEl.dataset.start) {
              const isPercent = targetStr.includes("%");
              const isMultiplier = targetStr.includes("x");
              
              if (isPercent) {
                targetVal = parseFloat(targetStr.replace("%", ""));
                displaySuffix = "%";
              } else if (isMultiplier) {
                targetVal = parseFloat(targetStr.replace("x", ""));
                displaySuffix = "x";
              } else {
                targetVal = parseFloat(targetStr);
              }
            } else {
              targetVal = parseFloat(targetStr);
            }

            if (isNaN(targetVal)) targetVal = 0;
            if (isNaN(startVal)) startVal = 0;

            const duration = 2000; // Animate over 2 seconds
            const startTime = performance.now();

            const animateValue = (currentTime: number) => {
              const elapsed = currentTime - startTime;
              const progress = Math.min(elapsed / duration, 1);
              
              // Easing out cubic for smooth slowing at the end
              const easeProgress = 1 - Math.pow(1 - progress, 3);
              const currentValue = startVal + easeProgress * (targetVal - startVal);
              
              const formattedValue = currentValue.toFixed(decimals);

              targetEl.textContent = `${displayPrefix}${formattedValue}${displaySuffix}`;

              if (progress < 1) {
                requestAnimationFrame(animateValue);
              } else {
                if (finalText) {
                  targetEl.textContent = finalText;
                } else {
                  targetEl.textContent = `${displayPrefix}${targetVal.toFixed(decimals)}${displaySuffix}`;
                }
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
