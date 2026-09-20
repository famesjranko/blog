// The build copies three's minified module beside the hero scripts, so
// the browser resolves `./three.module.min.js` at runtime. This shim,
// merged over `static/` via `rootDirs`, resolves the same specifier to
// three's types for `tsconfig.static.json`. It is never shipped.
export * from "three";
