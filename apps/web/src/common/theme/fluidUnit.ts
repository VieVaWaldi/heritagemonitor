// A single fluid scale unit so a page can shrink text/spacing/controls
// together as the viewport shrinks
const FLUID_UNIT_VAR = 'var(--fluid-unit, 1rem)'

export function fluidUnit(multiplier: number): string {
    return `calc(${FLUID_UNIT_VAR} * ${multiplier})`
}
