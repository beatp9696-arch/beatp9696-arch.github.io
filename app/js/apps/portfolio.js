// Portfolio opens the personal Cockpit and restores the last Cockpit/Health view.
// Living Thesis and its explicit demo remain in the same workspace. Holdings,
// prices and allocation targets stay on this device.
import { mountWorkspace } from "../features/living-thesis/workspace.js";
import { researchIcon } from "../core/research-store.js";

export default {
  id: "portfolio", name: "Portfolio", icon: researchIcon("activity"), defaultSize: { w: 1180, h: 820 },
  mount: mountWorkspace,
};
