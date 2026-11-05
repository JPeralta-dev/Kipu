/**
 * DOM utility functions for async element detection and manipulation.
 */

/**
 * Waits for a DOM element matching the specified selector to appear in the DOM.
 * Resolves immediately if the element is already present.
 * Uses MutationObserver to avoid inefficient polling.
 *
 * @param selector CSS selector string
 * @param timeoutMs Timeout in milliseconds (default 5000ms)
 * @returns Promise resolving to the Element or rejecting if timed out
 */
export function waitForElement<T extends Element = HTMLElement>(
  selector: string,
  timeoutMs = 5000
): Promise<T> {
  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined') {
      return reject(new Error('Document is not defined in this environment'));
    }

    if (selector === 'body') {
      return resolve(document.body as unknown as T);
    }

    const existing = document.querySelector<T>(selector);
    if (existing) {
      return resolve(existing);
    }

    let timer: ReturnType<typeof setTimeout>;

    const observer = new MutationObserver(() => {
      const el = document.querySelector<T>(selector);
      if (el) {
        clearTimeout(timer);
        observer.disconnect();
        resolve(el);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    timer = setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Timeout (${timeoutMs}ms) waiting for selector: "${selector}"`));
    }, timeoutMs);
  });
}
