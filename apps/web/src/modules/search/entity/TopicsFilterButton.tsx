'use client'

import type {TopicCountEntity} from '@heritagemonitor/shared'
import Button from '@mui/material/Button'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import {useState} from 'react'
import {TopicsModal} from '@/common/components'
import {useTopicBrowser, useTopicNames} from './useTopicBrowser'

export interface TopicsFilterButtonProps {
    /** Which entity's search the counts are computed against. */
    entity: TopicCountEntity
    /** Plural noun for those counts, e.g. "projects". */
    countNoun: string
    /** `pill` sits in the filter bar, `text` under the sidebar's topic facet. */
    variant?: 'pill' | 'text'
    label?: string
}

/**
 * Opens the topic browser. Only the open/closed state is local — every
 * selection goes straight into the URL like any other filter, so a link to
 * "these three topics" works and back undoes each choice.
 */
export function TopicsFilterButton({entity, countNoun, variant = 'pill', label = 'Topics'}: TopicsFilterButtonProps) {
    const [open, setOpen] = useState(false)
    const browser = useTopicBrowser(entity, open)
    const nameOf = useTopicNames()

    const selected = browser.selectedCount

    return (
        <>
            {variant === 'pill' ? (
                <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setOpen(true)}
                    endIcon={<AccountTreeIcon fontSize="small" />}
                    sx={[
                        {borderRadius: '50px', fontWeight: 500},
                        selected > 0
                            ? {
                                  backgroundColor: 'primary.main',
                                  color: 'primary.contrastText',
                                  borderColor: 'primary.main',
                                  '&:hover': {backgroundColor: 'primary.dark', borderColor: 'primary.dark'},
                              }
                            : {color: 'text.primary', borderColor: 'divider'},
                    ]}
                >
                    {label}
                    {selected > 0 ? ` (${selected})` : ''}
                </Button>
            ) : (
                <Button size="small" onClick={() => setOpen(true)} sx={{alignSelf: 'flex-start'}}>
                    {label}
                    {selected > 0 ? ` (${selected})` : ''}
                </Button>
            )}

            <TopicsModal
                open={open}
                onClose={() => setOpen(false)}
                tree={browser.tree}
                counts={browser.counts}
                selection={browser.selection}
                onToggle={browser.toggle}
                onClear={browser.clear}
                nameOf={nameOf}
                searchText={browser.searchText}
                onSearchTextChange={browser.setSearchText}
                matchedIds={browser.matchedIds}
                expandedIds={browser.expandedIds}
                onToggleExpanded={browser.toggleExpanded}
                loading={browser.loading}
                stale={browser.stale}
                selectedCount={browser.selectedCount}
                maxTopics={browser.maxTopics}
                countNoun={countNoun}
            />
        </>
    )
}
