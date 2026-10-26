'use client'

import PauseIcon from '@mui/icons-material/Pause'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Slider from '@mui/material/Slider'
import TextField from '@mui/material/TextField'
import {useCallback, useEffect, useRef, useState} from 'react'
import {Text} from '@/common/text'

export interface SingleSliderProps {
    min: number
    max: number
    value: number
    onChange: (value: number) => void
    step?: number
    label?: string
    playIntervalMs?: number
    /** Show the play/pause button that steps through the range. Only makes sense for something like years. */
    playable?: boolean
}

export function SingleSlider({
    min,
    max,
    value,
    onChange,
    step = 1,
    label = 'Year',
    playIntervalMs = 1000,
    playable = true,
}: SingleSliderProps) {
    const [localValue, setLocalValue] = useState<number>(value)
    const [input, setInput] = useState<string>(String(value))
    const [isPlaying, setIsPlaying] = useState(false)
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const tickRef = useRef<() => void>(() => {})

    // Reset local state when the `value` prop changes, without an effect
    // round-trip — see https://react.dev/learn/you-might-not-need-an-effect
    const [prevValue, setPrevValue] = useState(value)
    if (value !== prevValue) {
        setPrevValue(value)
        setLocalValue(value)
        setInput(String(value))
    }

    // Updated after every render (in an effect, not during render — refs
    // can't be written during render) so the interval always sees the
    // latest value.
    useEffect(() => {
        tickRef.current = () => {
            const next = localValue >= max ? min : localValue + step
            setLocalValue(next)
            setInput(String(next))
            onChange(next)
        }
    })

    useEffect(() => {
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current)
        }
    }, [])

    const handleSliderChange = useCallback(
        (_event: Event, newValue: number | number[]) => {
            const val = newValue as number
            setLocalValue(val)
            setInput(String(val))
            onChange(val)
        },
        [onChange],
    )

    const handleInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const val = e.target.value
            setInput(val)
            const num = parseInt(val, 10)
            if (!isNaN(num) && Math.abs(num - localValue) === step) {
                const clamped = Math.max(min, Math.min(num, max))
                if (clamped === num) {
                    setLocalValue(num)
                    onChange(num)
                }
            }
        },
        [localValue, step, min, max, onChange],
    )

    const handleInputBlur = useCallback(() => {
        let num = parseInt(input, 10)
        if (isNaN(num)) num = min
        const clamped = Math.max(min, Math.min(num, max))
        setLocalValue(clamped)
        setInput(String(clamped))
        onChange(clamped)
    }, [input, min, max, onChange])

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'Enter') handleInputBlur()
        },
        [handleInputBlur],
    )

    const togglePlay = useCallback(() => {
        if (isPlaying) {
            if (intervalRef.current) clearInterval(intervalRef.current)
            intervalRef.current = null
            setIsPlaying(false)
        } else {
            setIsPlaying(true)
            intervalRef.current = setInterval(() => tickRef.current(), playIntervalMs)
        }
    }, [isPlaying, playIntervalMs])

    return (
        <Box sx={{width: '100%'}}>
            <Slider
                value={localValue}
                onChange={handleSliderChange}
                min={min}
                max={max}
                step={step}
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
            <Box sx={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1}}>
                <Box sx={{width: '50%'}}>
                    <Text
                        variant="body2"
                        color="text.secondary"
                        sx={{mb: 0.5, textAlign: 'center'}}
                    >
                        {label}
                    </Text>
                    <TextField
                        value={input}
                        onChange={handleInputChange}
                        onBlur={handleInputBlur}
                        onKeyDown={handleKeyDown}
                        size="small"
                        fullWidth
                        type="number"
                        slotProps={{htmlInput: {min, max, step}}}
                        sx={{
                            '& .MuiOutlinedInput-root': {borderRadius: 1},
                            '& input': {textAlign: 'center'},
                        }}
                    />
                </Box>
                {playable && (
                    <IconButton onClick={togglePlay} size="small" color="primary">
                        {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
                    </IconButton>
                )}
            </Box>
        </Box>
    )
}
