'use client'

import {openAccessLabel, workLinks, type WorkRow} from '@heritagemonitor/shared'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import ListItemButton from '@mui/material/ListItemButton'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import Tooltip from '@mui/material/Tooltip'
import {Text} from '@/common/text'
import {formatAuthors, formatCitations, workTitle, workVenue} from './workFormat'

export interface WorkResultRowProps {
    work: WorkRow
    selected: boolean
    onSelect: (id: string) => void
}

const ROW_HEIGHT = 64

export function WorkResultRow({work, selected, onSelect}: WorkResultRowProps) {
    // The best link this work has: the PDF when there is one, else the DOI or
    // landing page. No link at all means no button, rather than a dead one.
    const link = workLinks(work)[0]
    const meta = [formatAuthors(work.authors, work.author_count), workVenue(work), formatCitations(work.citation_count)]
        .filter(Boolean)
        .join(' · ')

    return (
        <ListItemButton
            divider
            selected={selected}
            onClick={() => onSelect(work.id)}
            sx={{height: ROW_HEIGHT, display: 'flex', alignItems: 'center', gap: 1.5, px: 2.5}}
        >
            <Box sx={{flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column'}}>
                <Text variant="body1" truncate sx={{color: 'primary.main', fontWeight: 500}}>
                    {workTitle(work)}
                </Text>
                <Text variant="body2" truncate color="text.secondary">
                    {meta}
                </Text>
            </Box>

            {work.open_access_color && (
                <Tooltip title={openAccessLabel(work.open_access_color) ?? ''}>
                    <Chip label={work.open_access_color} size="small" variant="outlined" sx={{flexShrink: 0}} />
                </Tooltip>
            )}
            {/* The corpus marker is inherited from a linked project, never
                decided about the work itself — the label has to say so. */}
            {work.is_ch_via_project && (
                <Tooltip title="Cultural heritage via a linked project, not classified from the work itself">
                    <Chip label="DCH" size="small" color="secondary" variant="outlined" sx={{flexShrink: 0}} />
                </Tooltip>
            )}

            {link && (
                <Button
                    component="a"
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    // The row itself selects the work; the button leaves the app.
                    onClick={(event) => event.stopPropagation()}
                    variant="outlined"
                    size="small"
                    endIcon={<OpenInNewIcon fontSize="small" />}
                    sx={{minWidth: 84, flexShrink: 0}}
                >
                    {link.label}
                </Button>
            )}
        </ListItemButton>
    )
}
