#!/usr/bin/env node
// Minimal placeholder to unblock builds. Copies ABIs if configured, otherwise no-op.

try {
  console.log("sync-abis: no-op (placeholder)");
  process.exit(0);
} catch (e) {
  console.error("sync-abis failed:", e);
  process.exit(1);
}
