'use client'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import ListItem from '@mui/material/ListItem'
import {Text} from '@/common/text'

export interface SearchResultRowData {
    title: string
    meta: string
}

// Fixed so every row is the same height no matter how long the title/meta
// text is — the two lines truncate instead of growing the row.
const ROW_HEIGHT = 64

export function SearchResultRow({title, meta}: SearchResultRowData) {
    return (
        <ListItem
            divider
            sx={{
                height: ROW_HEIGHT,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                px: 2.5,
            }}
        >
            <Box sx={{flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column'}}>
                <Text
                    variant="body1"
                    truncate
                    sx={{
                        color: 'primary.main',
                        fontWeight: 500,
                        cursor: 'pointer',
                        '&:hover': {textDecoration: 'underline'},
                    }}
                >
                    {title}
                </Text>
                <Text variant="body2" truncate color="text.secondary">
                    {meta}
                </Text>
            </Box>

            <Button variant="outlined" size="small" sx={{minWidth: 64, flexShrink: 0}}>
                PDF
            </Button>
        </ListItem>
    )
}
