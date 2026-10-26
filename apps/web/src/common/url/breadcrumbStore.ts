import {pushStep, type BreadcrumbStep} from './breadcrumbTrail'

// The visitor's trail for THIS tab, held in module scope.
//
// Module scope rather than React state because the two things that need it sit
// in different places in the tree: the recorder is mounted once in the root
// layout (so every page is seen, whether or not the chat is open), and the
// chat reads the trail when a message is sent. A context would work too, but
// it would re-render the whole app on every navigation to deliver a value only
// one component reads, and only at send time.
//
// One tab, one module instance — exactly the scope a per-tab trail wants.

let trail: BreadcrumbStep[] = []

export function recordStep(step: BreadcrumbStep): void {
    trail = pushStep(trail, step)
}

/** The current trail, oldest first. */
export function currentTrail(): BreadcrumbStep[] {
    return trail
}

/** Test seam: module state has to be resettable. */
export function clearTrail(): void {
    trail = []
}
