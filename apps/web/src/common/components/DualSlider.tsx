'use client'

import PauseIcon from '@mui/icons-material/Pause'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Slider from '@mui/material/Slider'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import {useCallback, useEffect, useRef, useState} from 'react'
import {Text} from '@/common/text'

export interface DualSliderProps {
    min: number
    max: number
    value: [number, number]
    /** Fires continuously while dragging — for live preview, not for committing. */
    onChange: (value: [number, number]) => void
    /**
     * Fires once per finished ACTION rather than per pixel: releasing the
     * drag, stepping the number fields (their +/- buttons and arrow keys),
     * leaving a field or pressing Enter in it, and stopping playback. A
     * caller that writes somewhere expensive — the URL, an api request — uses
     * this; `onChange` stays the live preview. Defaults to `onChange`.
     */
    onChangeCommitted?: (value: [number, number]) => void
    step?: number
    fromLabel?: string
    toLabel?: string
    playIntervalMs?: number
}

export function DualSlider({
    min,
    max,
    value,
    onChange,
    onChangeCommitted,
    step = 1,
    fromLabel = 'From',
    toLabel = 'To',
    playIntervalMs = 1000,
}: DualSliderProps) {
    const [localValue, setLocalValue] = useState<[number, number]>(value)
    const [fromInput, setFromInput] = useState<string>(String(value[0]))
    const [toInput, setToInput] = useState<string>(String(value[1]))
    const [isPlaying, setIsPlaying] = useState(false)
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const tickRef = useRef<() => void>(() => {})

    // Updated after every render (in an effect, not during render — refs
    // can't be written during render) so the interval always sees the
    // latest value.
    useEffect(() => {
        tickRef.current = () => {
            const [from, to] = localValue
            let nextFrom: number
            let nextTo: number
            if (to >= max) {
                const range = to - from
                nextFrom = min
                nextTo = Math.min(min + range, max)
            } else {
                nextFrom = from + step
                nextTo = to + step
            }
            const newVal: [number, number] = [nextFrom, nextTo]
            setLocalValue(newVal)
            setFromInput(String(nextFrom))
            setToInput(String(nextTo))
            onChange(newVal)
        }
    })

    // Reset local state when the `value` prop changes, without an effect
    // round-trip — see https://react.dev/learn/you-might-not-need-an-effect.
    // Compared by content, not reference, so a caller passing a fresh tuple
    // literal each render (e.g. value={[from, to]}) doesn't cause a loop.
    const [prevValue, setPrevValue] = useState(value)
    if (value[0] !== prevValue[0] || value[1] !== prevValue[1]) {
        setPrevValue(value)
        setLocalValue(value)
        setFromInput(String(value[0]))
        setToInput(String(value[1]))
    }

    useEffect(() => {
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current)
        }
    }, [])

    // Every path that finishes an action funnels through here, so no control
    // can silently be the one that updates the preview but not the URL.
    const commit = useCallback(
        (value: [number, number]) => (onChangeCommitted ?? onChange)(value),
        [onChange, onChangeCommitted],
    )

    const handleSliderChange = useCallback(
        (_event: Event, newValue: number | number[]) => {
            const val = newValue as [number, number]
            setLocalValue(val)
            setFromInput(String(val[0]))
            setToInput(String(val[1]))
            onChange(val)
        },
        [onChange],
    )

    const handleFromInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const val = e.target.value
            setFromInput(val)

            const num = parseInt(val, 10)
            if (!isNaN(num) && Math.abs(num - localValue[0]) === step) {
                const clampedNum = Math.max(min, Math.min(num, localValue[1]))
                if (clampedNum === num) {
                    const newValue: [number, number] = [num, localValue[1]]
                    setLocalValue(newValue)
                    // A spinner click or an arrow key is one whole action.
                    commit(newValue)
                }
            }
        },
        [localValue, step, min, commit],
    )

    const handleToInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const val = e.target.value
            setToInput(val)

            const num = parseInt(val, 10)
            if (!isNaN(num) && Math.abs(num - localValue[1]) === step) {
                const clampedNum = Math.max(localValue[0], Math.min(num, max))
                if (clampedNum === num) {
                    const newValue: [number, number] = [localValue[0], num]
                    setLocalValue(newValue)
                    commit(newValue)
                }
            }
        },
        [localValue, step, max, commit],
    )

    const handleFromInputBlur = useCallback(() => {
        let num = parseInt(fromInput, 10)
        if (isNaN(num)) num = min
        num = Math.max(min, Math.min(num, localValue[1]))
        const newValue: [number, number] = [num, localValue[1]]
        setLocalValue(newValue)
        setFromInput(String(num))
        commit(newValue)
    }, [fromInput, min, localValue, commit])

    const handleToInputBlur = useCallback(() => {
        let num = parseInt(toInput, 10)
        if (isNaN(num)) num = max
        num = Math.max(localValue[0], Math.min(num, max))
        const newValue: [number, number] = [localValue[0], num]
        setLocalValue(newValue)
        setToInput(String(num))
        commit(newValue)
    }, [toInput, max, localValue, commit])

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent, type: 'from' | 'to') => {
            if (e.key === 'Enter') {
                if (type === 'from') handleFromInputBlur()
                else handleToInputBlur()
            }
        },
        [handleFromInputBlur, handleToInputBlur],
    )

    const togglePlay = useCallback(() => {
        if (isPlaying) {
            if (intervalRef.current) clearInterval(intervalRef.current)
            intervalRef.current = null
            setIsPlaying(false)
            // Playback scrubs live through `onChange` and commits once, here:
            // committing every tick would mean a request and a history entry
            // per second.
            commit(localValue)
        } else {
            setIsPlaying(true)
            intervalRef.current = setInterval(() => tickRef.current(), playIntervalMs)
        }
    }, [isPlaying, playIntervalMs, commit, localValue])

    return (
        <Box sx={{width: '100%'}}>
            <Slider
                value={localValue}
                onChange={handleSliderChange}
                onChangeCommitted={(_event, newValue) => commit(newValue as [number, number])}
                min={min}
                max={max}
                step={step}
                disableSwap
                sx={{
                    mb: 2,
                    '& .MuiSlider-thumb': {
                        width: 16,
                        height: 16,
                        backgroundColor: 'background.paper',
                        border: '2px solid currentColor',
                        '&:hover, &.Mui-focusVisible': {
                            boxShadow: '0 0 0 8px rgba(44, 95, 102, 0.16)',
                        },
                    },
                    '& .MuiSlider-track': {height: 4},
                    '& .MuiSlider-rail': {height: 4, opacity: 0.3},
                }}
            />
            <Stack direction="row" spacing={2}>
                <Box sx={{flex: 1}}>
                    <Text variant="body2" color="text.secondary" sx={{mb: 0.5}}>
                        {fromLabel}
                    </Text>
                    <TextField
                        value={fromInput}
                        onChange={handleFromInputChange}
                        onBlur={handleFromInputBlur}
                        onKeyDown={(e) => handleKeyDown(e, 'from')}
                        size="small"
                        fullWidth
                        type="number"
                        slotProps={{htmlInput: {min, max: localValue[1], step}}}
                        sx={{'& .MuiOutlinedInput-root': {borderRadius: 1}}}
                    />
                </Box>
                <Box sx={{flex: 1}}>
                    <Text variant="body2" color="text.secondary" sx={{mb: 0.5}}>
                        {toLabel}
                    </Text>
                    <TextField
                        value={toInput}
                        onChange={handleToInputChange}
                        onBlur={handleToInputBlur}
                        onKeyDown={(e) => handleKeyDown(e, 'to')}
                        size="small"
                        fullWidth
                        type="number"
                        slotProps={{htmlInput: {min: localValue[0], max, step}}}
                        sx={{'& .MuiOutlinedInput-root': {borderRadius: 1}}}
                    />
                </Box>
            </Stack>
            <Box sx={{display: 'flex', justifyContent: 'center', mt: 1}}>
                <IconButton onClick={togglePlay} size="small" color="primary">
                    {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
                </IconButton>
            </Box>
        </Box>
    )
}
