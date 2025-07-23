# Patch for @goodsdks/citizen-sdk Compatibility with lz-string

## Problem

The `@goodsdks/citizen-sdk` package expects the `lz-string` package to provide named ESM exports, but the installed `lz-string` only provides a CommonJS default export. This causes the following error when running the app:

```
Error: Failed to load external module @goodsdks/citizen-sdk: SyntaxError: The requested module 'lz-string' does not provide an export named 'compressToEncodedURIComponent'
```

## Workaround

Until the upstream packages are fixed, you need to patch the import in the SDK after installing dependencies.

### Steps

1. **Open the SDK file:**
   
   ```
   node_modules/@goodsdks/citizen-sdk/dist/index.js
   ```

2. **Find this line near the top:**
   ```js
   import { compressToEncodedURIComponent } from 'lz-string';
   ```

3. **Replace it with:**
   ```js
   import lzString from 'lz-string';
   const { compressToEncodedURIComponent } = lzString;
   ```

4. **Save the file.**

5. **Restart your dev server:**
   ```bash
   npm run dev
   # or
   pnpm dev
   ```

---

## Notes
- This patch will be lost if you reinstall or update your node_modules. Repeat these steps after every install.
- For a more permanent solution, consider using `patch-package` to automate this fix.
- The real fix should come from the package maintainers updating their code for ESM compatibility.

---

**If you have questions, ask the project maintainer!** 