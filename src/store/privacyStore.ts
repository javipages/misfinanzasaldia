import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useEffect } from "react";

interface PrivacyState {
  maskNumbers: boolean;
  toggleMaskNumbers: () => void;
  setMaskNumbers: (value: boolean) => void;
}

const STORAGE_KEY = "privacy-mask-storage";
const BODY_MASK_CLASS = "mask-sensitive";
const SENSITIVE_CLASS = "sensitive-number";
const AUTO_ATTR = "data-sensitive-auto";
const SKIP_SELECTOR = "[data-sensitive-skip=\"true\"]";
const ALWAYS_SELECTOR = "[data-sensitive-always=\"true\"]";
const CANDIDATE_SELECTOR = [
  "span",
  "div",
  "td",
  "th",
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "strong",
  "em",
  "li",
  "dd",
  "dt",
].join(",");

const isBrowser = typeof window !== "undefined" && typeof document !== "undefined";

export const usePrivacyStore = create<PrivacyState>()(
  persist(
    (set) => ({
      maskNumbers: false,
      toggleMaskNumbers: () =>
        set((state) => ({
          maskNumbers: !state.maskNumbers,
        })),
      setMaskNumbers: (value) => set({ maskNumbers: value }),
    }),
    {
      name: STORAGE_KEY,
    }
  )
);

const isNumericLike = (text: string) => {
  const trimmed = text.trim();
  if (!trimmed) return false;
  const compact = trimmed.replace(/\s+/g, "");
  const digits = (compact.match(/\d/g) ?? []).length;
  if (digits === 0) return false;
  const withoutSymbols = compact.replace(/[\d.,€$£¥+\-/%()\u00A0]/g, "");
  const hasLetters = /[A-Za-z]/.test(withoutSymbols);
  if (hasLetters) return digits / compact.length >= 0.6;
  return digits / compact.length >= 0.4;
};

const shouldMaskElement = (element: HTMLElement) => {
  if (element.dataset.sensitiveAlways === "true") return true;
  if (element.dataset.sensitiveSkip === "true") return false;
  if (element.closest(ALWAYS_SELECTOR)) return true;
  if (element.closest(SKIP_SELECTOR)) return false;
  const text = element.textContent ?? "";
  return isNumericLike(text);
};

const markElement = (element: HTMLElement) => {
  if (!element.classList.contains(SENSITIVE_CLASS)) {
    element.classList.add(SENSITIVE_CLASS);
  }
  element.setAttribute(AUTO_ATTR, "true");
};

const unmarkElement = (element: HTMLElement) => {
  if (element.getAttribute(AUTO_ATTR) === "true") {
    element.classList.remove(SENSITIVE_CLASS);
    element.removeAttribute(AUTO_ATTR);
  }
};

const processElement = (element: Element) => {
  if (!(element instanceof HTMLElement)) return;
  if (element.dataset.sensitiveManual === "true") {
    element.classList.add(SENSITIVE_CLASS);
    return;
  }

  if (shouldMaskElement(element)) {
    markElement(element);
  } else {
    unmarkElement(element);
  }
};

const scanTree = (root: ParentNode) => {
  if (root instanceof HTMLElement) {
    processElement(root);
  }
  root.querySelectorAll(CANDIDATE_SELECTOR).forEach((node) => {
    processElement(node);
  });
};

const clearAutoMasked = () => {
  if (!isBrowser) return;
  document
    .querySelectorAll<HTMLElement>(`[${AUTO_ATTR}="true"]`)
    .forEach((element) => {
      element.classList.remove(SENSITIVE_CLASS);
      element.removeAttribute(AUTO_ATTR);
    });
};

export const usePrivacyEffect = () => {
  const maskNumbers = usePrivacyStore((state) => state.maskNumbers);

  useEffect(() => {
    if (!isBrowser) return;

    if (!maskNumbers) {
      clearAutoMasked();
      document.body.classList.remove(BODY_MASK_CLASS);
      return;
    }

    document.body.classList.add(BODY_MASK_CLASS);
    scanTree(document.body);

    let frame = 0;
    const scheduleProcess = (nodes: Array<Node>) => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const uniqueElements = new Set<Element>();

        nodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            uniqueElements.add(node);
          } else if (node.parentElement) {
            uniqueElements.add(node.parentElement);
          }
        });

        uniqueElements.forEach((element) => {
          processElement(element);
          element.querySelectorAll(CANDIDATE_SELECTOR).forEach((child) => {
            processElement(child);
          });
        });
      });
    };

    const observer = new MutationObserver((mutations) => {
      const nodes: Array<Node> = [];
      mutations.forEach((mutation) => {
        if (mutation.type === "characterData" && mutation.target) {
          nodes.push(mutation.target);
        }
        mutation.addedNodes.forEach((node) => {
          nodes.push(node);
        });
      });
      if (nodes.length > 0) {
        scheduleProcess(nodes);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      if (frame) cancelAnimationFrame(frame);
      observer.disconnect();
      clearAutoMasked();
      document.body.classList.remove(BODY_MASK_CLASS);
    };
  }, [maskNumbers]);
};
