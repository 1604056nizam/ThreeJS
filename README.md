# ThreeJS — Quick Start

A minimal guide to **install**, **run**, and **show outputs ** for this Three.js + Vite project.

---

## Prerequisites

- **Node.js 18+** (20+ recommended)
- **npm** (or `pnpm` / `yarn`)

Check your versions:

```bash
node -v
npm -v
```

---

## Install

```bash
git clone https://github.com/1604056nizam/ThreeJS.git
cd ThreeJS
npm install
```

> Ensure your `package.json` has these scripts:
>
> ```json
> {
>   "scripts": {
>     "dev": "vite",
>     "build": "vite build",
>     "preview": "vite preview"
>   }
> }
> ```

---

## Run (Development)

```bash
npm run dev
```

Open the URL printed by Vite (typically `http://localhost:5173/`).

**Tips**

- Different port: `npm run dev -- --port 5174`
- Expose to LAN: `npm run dev -- --host`

---

## Output & Preview 

<video width="600" controls>
   <source src="public/assets/media/demo.mp4" type="video/mp4">
   Your browser does not support HTML video.
</video>

---


