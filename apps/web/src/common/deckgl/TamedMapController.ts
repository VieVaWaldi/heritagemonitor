import {MapController} from '@deck.gl/core'

// Ported from digicher_webinterface. With inertia on, lifting a pinch on
// mobile can hand deck.gl a near-zero time delta, which turns into an
// effectively infinite zoom velocity — this controller caps that.

// Matches deck.gl's internal inertia easing.
const INERTIA_EASING = (t: number) => 1 - (1 - t) * (1 - t)

// Below this gap between the last two pinch events the velocity blows up
// (touchend fires almost with the last touchmove) — skip inertia entirely.
const MIN_DT_MS = 16

// Max zoom velocity in log2-zoom units per ms, against fast-but-not-simultaneous lifts.
const MAX_VELOCITY_PER_MS = 0.004

/* eslint-disable @typescript-eslint/no-explicit-any -- deck.gl's controller internals aren't typed */
export class TamedMapController extends MapController {
    private _lastPinchEvent: Record<string, unknown> | null = null

    protected override _onPinchStart(event: any): boolean {
        this._lastPinchEvent = null
        return super._onPinchStart(event)
    }

    protected override _onPinch(event: any): boolean {
        this._lastPinchEvent = event
        return super._onPinch(event)
    }

    protected override _onPinchEnd(event: any): boolean {
        const lastEvent = this._lastPinchEvent
        this._lastPinchEvent = null

        if (!this.isDragging()) return false

        const inertia = (this as any).inertia as number
        if (!(inertia > 0 && lastEvent && event.scale !== lastEvent.scale)) return super._onPinchEnd(event)

        const dt = (event.deltaTime as number) - (lastEvent.deltaTime as number)

        // Reusing the last scale makes deck.gl take its plain zoomEnd branch, no transition.
        if (dt < MIN_DT_MS) return super._onPinchEnd({...event, scale: lastEvent.scale})

        const pos = this.getCenter(event)
        const z = Math.log2(event.scale as number)
        const rawVelocity = (z - Math.log2(lastEvent.scale as number)) / dt
        const velocityZ = Math.sign(rawVelocity) * Math.min(Math.abs(rawVelocity), MAX_VELOCITY_PER_MS)
        const endScale = Math.pow(2, z + (velocityZ * inertia) / 2)

        const newState = (this.controllerState as any).rotateEnd().zoom({pos, scale: endScale}).zoomEnd()

        ;(this as any).updateViewport(
            newState,
            {
                ...(this as any)._getTransitionProps({around: pos}),
                transitionDuration: inertia,
                transitionEasing: INERTIA_EASING,
            },
            {isDragging: false, isPanning: true, isZooming: true, isRotating: false},
        )
        ;(this as any).blockEvents(inertia)
        return true
    }
}
/* eslint-enable @typescript-eslint/no-explicit-any */
