// Whether a search may fall back to the typo-tolerant rerun.
//
// The fallback fires per request when the strict total is small. A list that
// belongs to a parent's number (an expert's matching projects, a stream's
// projects) is narrowed by that parent, which makes the strict total small, so
// it would silently turn into a looser search than the number it hangs off.
// Those requests send `strict=true` and get the strict search only; the main
// lists send nothing and keep their "close matches" behaviour.

/** A blank query has nothing to misspell; `strict=true` opts out explicitly. */
export function typoFallbackAllowed(q: string | undefined, strict: string | undefined): boolean {
    return (q ?? '').trim().length > 0 && strict !== 'true'
}
