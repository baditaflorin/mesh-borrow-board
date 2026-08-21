import { createMeshConfig } from "@baditaflorin/mesh-common";

export const config = createMeshConfig({
  appName: "mesh-borrow-board",
  description: "A browser-local lending board for things neighbours can borrow and return.",
  accentHex: "#2563eb",
  version: __APP_VERSION__,
  commit: __GIT_COMMIT__,
});
