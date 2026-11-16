# Cyber Academy: The Digital Awakening

Playable WebGL vertical slice based on the project's [GDD](./gdd.md). It uses Vue 3 for the game interface, Three.js for the 3D world and animation, Rapier for character physics, and Pinia for local game state.

## Run locally

```sh
npm install
npm run dev
```

Open the URL printed by Vite. WebGL is required.

## Build and deploy

```sh
npm run build
npm run preview
```

Deploy the contents of `dist/` to any static web host. The Vite base path is relative, so the build can also be hosted below a domain subpath. No server, API key, or external service is required. Player progress is saved in browser local storage on that device.

## Controls

- Desktop: WASD, Shift, Space, E; drag the scene to orbit the camera and use the mouse wheel to zoom.
- Touchscreen: virtual joystick, jump, sprint, and action buttons; drag the scene to orbit the camera.
- Open the mission journal with J (or the journal button); Escape closes an open panel.

## Included slice

Explore a color-blocked academy level, follow ARIA (a local context-aware companion), and complete five interactive digital-safety scenarios about account security, phishing, least privilege, backups, and incident response. Correct decisions award XP and unlock the next station. Character movement uses the supplied FBX idle, walk, run, and jump clips with cross-faded locomotion transitions. ARIA's guidance is authored in the client rather than calling a hosted generative-AI service, keeping static deployments self-contained.

The supplied FBX level and character/animation files are copied into `public/assets/models/` and loaded at runtime. The original source assets remain unchanged. The GDD's broader backend, additional learning zones, character customization, and other chapters are outside this first playable slice.
