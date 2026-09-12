import { validateResearch } from "./research-model.js";

let pending;
export function getResearch({ retry = false } = {}) {
  if (retry) pending = null;
  if (!pending) {
    pending = (async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      try {
        const response = await fetch(new URL("../../data/research.json", import.meta.url), { signal: controller.signal, cache: "no-cache" });
        if (!response.ok) throw new Error(`Research unavailable (${response.status})`);
        return validateResearch(await response.json());
      } finally { clearTimeout(timeout); }
    })().catch((error) => { pending = null; throw error; });
  }
  return pending;
}

export const researchIcon = (name) => `<span class="rx-icon" aria-hidden="true" style="--rx-icon:url('${new URL(`../../assets/icons/research/${name}.svg`, import.meta.url).href}')"></span>`;
