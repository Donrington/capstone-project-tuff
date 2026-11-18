#!/usr/bin/env node
/**
 * Self-host MediaPipe's WASM runtime. The app's CSP allows only 'self', and
 * keeping the files beside node_modules' version means an install or upgrade
 * refreshes them automatically (see `postinstall`). The model itself is a
 * separate, pinned download in public/mediapipe/.
 */
import { access, cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "node_modules", "@mediapipe", "tasks-vision", "wasm");
const destination = path.join(root, "public", "mediapipe", "wasm");

await access(source); // fail loudly if the dependency hasn't been installed
// Replace wholesale: an upgrade can remove a wasm file as well as add one.
await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });
await cp(source, destination, { recursive: true, force: true });
console.log("Copied MediaPipe WASM into public/mediapipe/wasm/.");
