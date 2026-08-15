# Phase 1 — Contract + LifecycleScope

**Status:** done  
**Visible change:** none

## Delivered

| Item | Path |
|------|------|
| LifecycleScope | `src/core/LifecycleScope.js` |
| Unit tests (order / idempotent / error isolation) | `src/core/LifecycleScope.test.js` |
| Definition registry validation + label | `src/core/WidgetRegistry.js` |
| Registry tests | `src/core/WidgetRegistry.test.js` |
| JSDoc types | `src/core/WidgetTypes.js` |
| `package.json` `"type": "module"` | + `test:unit` / `test` / `test:normalize` |

## Commands

```bash
npm run test:unit
npm run test
npm run build
```

## Next

**Phase 2 — Clock Pilot:** Clock `destroy()` + cleanup; three-round remount must be clean.
