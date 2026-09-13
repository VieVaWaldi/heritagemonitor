'use client'

import {useState} from 'react'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Divider from '@mui/material/Divider'
import Button from '@mui/material/Button'
import StarIcon from '@mui/icons-material/Star'
import {Text} from '@/common/text'
import {
    DualSlider,
    FilterChip,
    FilterSection,
    IconTextButton,
    IconTextPill,
    MultiSelectDropdown,
    type MultiSelectOption,
    SearchBar,
    SideMenu,
    Slider,
    SingleSlider,
    ViewModeToggle,
    type ViewMode,
} from '@/common/components'

const MULTI_SELECT_OPTIONS: MultiSelectOption[] = [
    {value: 'a', label: 'Option A'},
    {value: 'b', label: 'Option B'},
    {value: 'c', label: 'Option C'},
]

function Section({title, children}: {title: string; children: React.ReactNode}) {
    return (
        <Box sx={{mb: 4}}>
            <Text variant="h6" sx={{mb: 2}}>
                {title}
            </Text>
            {children}
        </Box>
    )
}

export function ComponentsDemoPage() {
    const [iconTextButtonSelected, setIconTextButtonSelected] = useState(false)
    const [iconTextPillSelected, setIconTextPillSelected] = useState(true)
    const [multiSelectValue, setMultiSelectValue] = useState<string[]>(['a'])
    const [searchValue, setSearchValue] = useState('')
    const [sideMenuOpen, setSideMenuOpen] = useState(false)
    const [singleSliderValue, setSingleSliderValue] = useState(2010)
    const [sliderValue, setSliderValue] = useState(50)
    const [dualSliderValue, setDualSliderValue] = useState<[number, number]>([1990, 2010])
    const [viewMode, setViewMode] = useState<ViewMode>('list')

    return (
        <Box sx={{p: 4, maxWidth: 800, position: 'relative'}}>
            <Text variant="h4" component="h1" sx={{mb: 1}}>
                Components
            </Text>
            <Text variant="body2" color="text.secondary" sx={{mb: 4}}>
                Every ported common/mui component, with representative sample props.
            </Text>

            <Section title="FilterChip">
                <Stack direction="row" spacing={1}>
                    <FilterChip label="Archaeology" color={[44, 95, 102]} onRemove={() => {}} />
                    <FilterChip label="Museums" color={[139, 105, 20]} onRemove={() => {}} />
                </Stack>
            </Section>

            <Section title="FilterSection">
                <Box sx={{maxWidth: 320}}>
                    <FilterSection title="Evaluation pillars">
                        <FilterChip label="Impact" color={[44, 95, 102]} />
                    </FilterSection>
                </Box>
            </Section>

            <Section title="IconTextButton">
                <Stack direction="row" spacing={1}>
                    <IconTextButton
                        icon={<StarIcon fontSize="small" />}
                        label="Favorite"
                        selected={iconTextButtonSelected}
                        onClick={() => setIconTextButtonSelected((v) => !v)}
                    />
                    <IconTextButton icon={<StarIcon fontSize="small" />} tooltip="Icon only" />
                </Stack>
            </Section>

            <Section title="IconTextPill">
                <IconTextPill
                    icon={<StarIcon fontSize="small" />}
                    label="Featured"
                    selected={iconTextPillSelected}
                    onClick={() => setIconTextPillSelected((v) => !v)}
                />
            </Section>

            <Section title="MultiSelectDropdown">
                <Box sx={{maxWidth: 320}}>
                    <MultiSelectDropdown
                        options={MULTI_SELECT_OPTIONS}
                        value={multiSelectValue}
                        onChange={setMultiSelectValue}
                    />
                </Box>
            </Section>

            <Section title="SearchBar">
                <Box sx={{maxWidth: 400}}>
                    <SearchBar
                        value={searchValue}
                        onSearch={setSearchValue}
                        onClear={() => setSearchValue('')}
                    />
                </Box>
            </Section>

            <Section title="SideMenu">
                <Button variant="outlined" onClick={() => setSideMenuOpen(true)}>
                    Open side menu
                </Button>
                <SideMenu
                    side="right"
                    title="Sample menu"
                    open={sideMenuOpen}
                    onClose={() => setSideMenuOpen(false)}
                >
                    <Text variant="body2">Menu content goes here.</Text>
                </SideMenu>
            </Section>

            <Section title="SingleSlider">
                <Box sx={{maxWidth: 400}}>
                    <SingleSlider
                        min={1990}
                        max={2025}
                        value={singleSliderValue}
                        onChange={setSingleSliderValue}
                    />
                </Box>
            </Section>

            <Section title="Slider">
                <Box sx={{maxWidth: 400}}>
                    <Slider
                        min={0}
                        max={100}
                        value={sliderValue}
                        onChange={setSliderValue}
                        label="Score"
                    />
                </Box>
            </Section>

            <Section title="DualSlider">
                <Box sx={{maxWidth: 400}}>
                    <DualSlider
                        min={1990}
                        max={2025}
                        value={dualSliderValue}
                        onChange={setDualSliderValue}
                    />
                </Box>
            </Section>

            <Divider sx={{mb: 4}} />

            <Section title="ViewModeToggle">
                <ViewModeToggle value={viewMode} onChange={setViewMode} />
            </Section>
        </Box>
    )
}
