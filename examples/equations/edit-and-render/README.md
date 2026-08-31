# Edit notation without losing meaning

This Phase 4 Step 4.1 example creates the constant-acceleration displacement equation, edits it to add a second acceleration term and compares the Physica semantic identities before and after the edit.

The output proves that unchanged canonical subtrees retain their UUID identities, newly authored semantics receive new identities, the equation configuration survives canonical ProjectDocument serialization and KaTeX produces stable HTML plus MathML. Rendering is presentation-only: neither MathLive offsets nor KaTeX glyph spans own semantic identity.

Run it from the repository root with `pnpm vitest run examples/equations/edit-and-render`.
