import { createMeshConfig } from "@baditaflorin/mesh-common";

export const config = createMeshConfig({
  appName: "mesh-borrow-board",
  displayName: "Borrow Board",
  description: "A browser-local lending board for things neighbours can borrow and return.",
  visualProfile: "utility",
  shellLayout: "inset",
  accentHex: "#7ea5ff",
  version: __APP_VERSION__,
  commit: __GIT_COMMIT__,
});
