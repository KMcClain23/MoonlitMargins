// next build / next dev handle CSS imports through their own webpack/Turbopack
// loader, so this never affected the actual app -- but running `tsc --noEmit`
// directly (outside of Next's own type-checking pipeline) doesn't know what
// to do with a bare `import "./globals.css"` and reports a phantom error.
// This ambient declaration silences that so a plain tsc run reports the same
// clean signal as `next build` does.
declare module "*.css";
