'use client'

import Box from '@mui/material/Box'
import MuiSlider from '@mui/material/Slider'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import HelpIcon from '@mui/icons-material/Help'
import {useCallback, useState} from 'react'
import {Text} from '@/common/text'

export interface SliderProps {
    min: number
    max: number
    value: number
    onChange: (value: number) => void
    step?: number
    label?: string
    /** If provided, shows a HelpIcon to the left of the label with a tooltip on hover. */
    helpText?: string
    textFieldWidth?: number
}

export function Slider({
    min,
    max,
    value,
    onChange,
    step = 1,
    label,
    helpText,
    textFieldWidth = 100,
}: SliderProps) {
    const [localValue, setLocalValue] = useState<number>(value)
    const [inputValue, setInputValue] = useState<string>(String(value))

    // Reset local state when the `value` prop changes, without an effect
    // round-trip — see https://react.dev/learn/you-might-not-need-an-effect
    const [prevValue, setPrevValue] = useState(value)
    if (value !== prevValue) {
        setPrevValue(value)
        setLocalValue(value)
        setInputValue(String(value))
    }

    const handleSliderChange = useCallback(
        (_event: Event, newValue: number | number[]) => {
            const val = newValue as number
            setLocalValue(val)
            setInputValue(String(val))
            onChange(val)
        },
        [onChange],
    )

    const handleInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const val = e.target.value
            setInputValue(val)

            // Detect spinner arrow clicks: value changes by exactly step
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
        let num = parseInt(inputValue, 10)
        if (isNaN(num)) num = min
        num = Math.max(min, Math.min(num, max))
        setLocalValue(num)
        setInputValue(String(num))
        onChange(num)
    }, [inputValue, min, max, onChange])

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'Enter') handleInputBlur()
        },
        [handleInputBlur],
    )

    return (
        <Box sx={{width: '100%'}}>
            {label && (
                <Stack direction="row" spacing={0.5} sx={{alignItems: 'center', mb: 1}}>
                    {helpText && (
                        <Tooltip title={helpText} placement="right" arrow>
                            <HelpIcon
                                sx={{fontSize: 16, color: 'text.secondary', cursor: 'help'}}
                            />
                        </Tooltip>
                    )}
                    <Text variant="body2" color="text.secondary">
                        {label}
                    </Text>
                </Stack>
            )}
            <MuiSlider
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
            <TextField
                value={inputValue}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                onKeyDown={handleKeyDown}
                size="small"
                type="number"
                slotProps={{htmlInput: {min, max, step}}}
                sx={{width: textFieldWidth, '& .MuiOutlinedInput-root': {borderRadius: 1}}}
            />
        </Box>
    )
}
