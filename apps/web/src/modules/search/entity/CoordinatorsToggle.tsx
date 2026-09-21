'use client'

import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import {SEARCH_PARAM, useUrlState} from '@/common/url'
import {Text} from '@/common/text'

/** The value of the URL param when the toggle is on. */
const ON = 'true'

/** Whether the "coordinators only" switch is on in these params. */
export function readCoordinatorsOnly(params: URLSearchParams): boolean {
    return params.get(SEARCH_PARAM.coordinators) === ON
}

/**
 * "Rank by the projects an organisation COORDINATES" — experts and funding
 * only (the ranking pages that aggregate organisations from projects).
 *
 * The caption is not optional: `coordinator_ids` exists only for EC projects,
 * so switching this on also removes every non-EC project from the ranking, and
 * a user who does not know that reads a short list as "nobody coordinates".
 */
export function CoordinatorsToggle() {
    const {params, update} = useUrlState()

    return (
        <>
            <FormControlLabel
                control={
                    <Switch
                        checked={readCoordinatorsOnly(params)}
                        onChange={(event) => update({[SEARCH_PARAM.coordinators]: event.target.checked ? ON : null})}
                    />
                }
                label={<Text variant="body2">Coordinators only</Text>}
                sx={{ml: 0, display: 'flex'}}
            />
            <Text variant="caption" color="text.secondary" sx={{display: 'block'}}>
                Ranks organisations by the projects they coordinate. Only EC projects record a coordinator, so other funders&apos; projects are left out.
            </Text>
        </>
    )
}
