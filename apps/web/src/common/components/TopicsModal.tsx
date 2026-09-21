'use client'

import type {TopicCountsResponse, TopicLevel, TopicTreeNode} from '@heritagemonitor/shared'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import Collapse from '@mui/material/Collapse'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import {alpha} from '@mui/material/styles'
import {useEffect, useRef, type ReactNode} from 'react'
import {Text} from '@/common/text'
import {SearchBar} from './SearchBar'

/** Which ids are selected, per level. Mirrors the three URL params. */
export interface TopicSelectionValue {
    field: string[]
    subfield: string[]
    topic: string[]
}

export interface TopicsModalProps {
    open: boolean
    onClose: () => void
    tree: TopicTreeNode[]
    /** Document counts under the caller's current search; a node absent here is hidden. */
    counts: TopicCountsResponse
    selection: TopicSelectionValue
    onToggle: (level: TopicLevel, id: string) => void
    onClear: () => void
    /** Names for the selected ids, so a chip never shows a bare id. */
    nameOf: (level: TopicLevel, id: string) => string
    searchText: string
    onSearchTextChange: (text: string) => void
    /** Node ids the current search matched — expanded, highlighted, scrolled to. */
    matchedIds: ReadonlySet<string>
    /** Ancestors of those matches, so the path down to them is open. */
    expandedIds: ReadonlySet<string>
    onToggleExpanded: (id: string) => void
    loading: boolean
    /**
     * The counts shown are for a slightly older request. Rendered as a faint
     * dim, never as a placeholder swap: replacing the tree is what made the
     * dialog jump.
     */
    stale?: boolean
    selectedCount: number
    maxTopics: number
    /** Plural noun for the counted documents, e.g. "projects". */
    countNoun: string
}

const CHIPS_SHOWN = 6
const INDENT_PER_LEVEL = 2.5

/**
 * The matched part of a name, marked. Plain <mark> styled from the palette:
 * "why is this row here" has to be answerable at a glance when the tree has
 * been opened for you.
 */
function Highlighted({text, query}: {text: string; query: string}): ReactNode {
    const needle = query.trim()
    if (!needle) return text

    const index = text.toLowerCase().indexOf(needle.toLowerCase())
    if (index < 0) return text

    return (
        <>
            {text.slice(0, index)}
            <Box
                component="mark"
                sx={(theme) => ({
                    backgroundColor: alpha(theme.palette.secondary.main, 0.35),
                    color: 'inherit',
                    px: 0.25,
                    borderRadius: 0.5,
                })}
            >
                {text.slice(index, index + needle.length)}
            </Box>
            {text.slice(index + needle.length)}
        </>
    )
}

interface TopicNodeRowProps extends Pick<
    TopicsModalProps,
    'counts' | 'selection' | 'onToggle' | 'onToggleExpanded' | 'matchedIds' | 'expandedIds' | 'searchText'
> {
    node: TopicTreeNode
    depth: number
    atCap: boolean
    firstMatchRef: (element: HTMLElement | null) => void
    /** The one match to scroll to, computed once over the whole visible tree. */
    firstMatchId: string | null
}

function TopicNodeRow({
    node,
    depth,
    counts,
    selection,
    onToggle,
    onToggleExpanded,
    matchedIds,
    expandedIds,
    searchText,
    atCap,
    firstMatchRef,
    firstMatchId,
}: TopicNodeRowProps) {
    const count = counts[node.level][node.id]
    // A node with no matching documents is not a choice worth offering — on
    // the DCH corpus that is most of the tree.
    if (count == null || count === 0) return null

    const selected = selection[node.level].includes(node.id)
    const expandable = node.children.length > 0
    const expanded = expandedIds.has(node.id)
    const matched = matchedIds.has(node.id)
    // Selecting more is blocked at the cap, but unticking must always work.
    const disabled = atCap && !selected

    return (
        <Box>
            <Box
                ref={node.id === firstMatchId ? firstMatchRef : undefined}
                sx={{display: 'flex', alignItems: 'center', gap: 0.5, pl: depth * INDENT_PER_LEVEL, minHeight: 36}}
            >
                {expandable ? (
                    <IconButton
                        size="small"
                        onClick={() => onToggleExpanded(node.id)}
                        aria-label={expanded ? `Collapse ${node.name}` : `Expand ${node.name}`}
                        aria-expanded={expanded}
                    >
                        {expanded ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
                    </IconButton>
                ) : (
                    <Box sx={{width: 30, flexShrink: 0}} />
                )}

                <Checkbox
                    size="small"
                    checked={selected}
                    disabled={disabled}
                    onChange={() => onToggle(node.level, node.id)}
                    slotProps={{input: {'aria-label': `Select ${node.name}`}}}
                    sx={{p: 0.5}}
                />

                <Text
                    variant="body2"
                    truncate
                    sx={{
                        flex: '1 1 auto',
                        minWidth: 0,
                        fontWeight: matched ? 600 : 400,
                        color: disabled ? 'text.disabled' : 'text.primary',
                    }}
                >
                    <Highlighted text={node.name} query={searchText} />
                </Text>

                <Text variant="caption" color="text.secondary" sx={{flexShrink: 0, pl: 1}}>
                    {count.toLocaleString('en-US')}
                </Text>
            </Box>

            {expandable && (
                <Collapse in={expanded} unmountOnExit>
                    {node.children.map((child) => (
                        <TopicNodeRow
                            key={child.id}
                            node={child}
                            depth={depth + 1}
                            counts={counts}
                            selection={selection}
                            onToggle={onToggle}
                            onToggleExpanded={onToggleExpanded}
                            matchedIds={matchedIds}
                            expandedIds={expandedIds}
                            searchText={searchText}
                            atCap={atCap}
                            firstMatchRef={firstMatchRef}
                            firstMatchId={firstMatchId}
                        />
                    ))}
                </Collapse>
            )}
        </Box>
    )
}

/**
 * Walks the tree in display order and returns the first matched node that is
 * actually rendered — a node hidden for having no documents cannot be
 * scrolled to.
 */
function findFirstMatch(
    nodes: TopicTreeNode[],
    matchedIds: ReadonlySet<string>,
    counts: TopicCountsResponse,
): string | null {
    for (const node of nodes) {
        const count = counts[node.level][node.id]
        if (count == null || count === 0) continue
        if (matchedIds.has(node.id)) return node.id
        const inChildren = findFirstMatch(node.children, matchedIds, counts)
        if (inChildren) return inChildren
    }
    return null
}

/**
 * The topic browser: the whole field > subfield > topic hierarchy with the
 * counts the current search would produce, and a search box that OPENS what
 * it finds rather than filtering the tree down to it.
 *
 * That difference is the point. Filtering to matches (what the previous app
 * did) hides where a topic sits, which is exactly what someone browsing a
 * hierarchy needs to see; expanding the path down to the match and
 * highlighting it answers "what is this, and what is it part of" in one view.
 *
 * Presentational: the tree, the counts, the matches and the selection are all
 * given to it. Where they come from is the caller's business — see
 * useTopicBrowser — which is also what makes it reusable by any entity.
 */
export function TopicsModal({
    open,
    onClose,
    tree,
    counts,
    selection,
    onToggle,
    onClear,
    nameOf,
    searchText,
    onSearchTextChange,
    matchedIds,
    expandedIds,
    onToggleExpanded,
    loading,
    stale,
    selectedCount,
    maxTopics,
    countNoun,
}: TopicsModalProps) {
    const firstMatchElement = useRef<HTMLElement | null>(null)

    // Bring the first match into view once the tree has opened around it —
    // a match six screens down is not "found" until it is on screen.
    useEffect(() => {
        if (!open || matchedIds.size === 0) return
        const element = firstMatchElement.current
        if (element) element.scrollIntoView({block: 'center', behavior: 'smooth'})
    }, [open, matchedIds])

    const atCap = selectedCount >= maxTopics
    const chips: Array<{level: TopicLevel; id: string}> = [
        ...selection.topic.map((id) => ({level: 'topic' as const, id})),
        ...selection.subfield.map((id) => ({level: 'subfield' as const, id})),
        ...selection.field.map((id) => ({level: 'field' as const, id})),
    ]

    // The first match in TREE order — not the best-scoring one — because that
    // is the one the eye reaches first when the tree opens.
    const firstMatchId = findFirstMatch(tree, matchedIds, counts)

    return (
        // A fixed tall paper: the content's height changes as topics are
        // ticked, and a dialog that resized under the cursor moved the next
        // checkbox out from under it.
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="sm"
            scroll="paper"
            slotProps={{paper: {sx: {height: '80vh'}}}}
        >
            <DialogTitle sx={{pb: 1}}>Topics</DialogTitle>

            <DialogContent dividers sx={{p: 0}}>
                <Box sx={{p: 2, pb: 1, position: 'sticky', top: 0, backgroundColor: 'background.paper', zIndex: 1}}>
                    <SearchBar
                        value={searchText}
                        onSearch={onSearchTextChange}
                        onClear={() => onSearchTextChange('')}
                        placeholder="Search topics, subfields and fields..."
                        size="small"
                        autoFocus
                    />

                    {chips.length > 0 && (
                        <Stack direction="row" sx={{flexWrap: 'wrap', gap: 0.75, mt: 1.5, alignItems: 'center'}}>
                            {chips.slice(0, CHIPS_SHOWN).map((chip) => (
                                <Chip
                                    key={`${chip.level}:${chip.id}`}
                                    label={nameOf(chip.level, chip.id)}
                                    size="small"
                                    color="primary"
                                    variant="outlined"
                                    onDelete={() => onToggle(chip.level, chip.id)}
                                />
                            ))}
                            {chips.length > CHIPS_SHOWN && (
                                <Text variant="caption" color="text.secondary">
                                    +{chips.length - CHIPS_SHOWN} more
                                </Text>
                            )}
                            <Button size="small" onClick={onClear}>
                                Clear
                            </Button>
                        </Stack>
                    )}

                    {atCap && (
                        <Text variant="caption" color="warning.main" sx={{display: 'block', mt: 1}}>
                            Maximum of {maxTopics} topics selected — remove one to choose another.
                        </Text>
                    )}
                </Box>

                {/* Dims while newer counts are in flight, and keeps the tree
                    exactly where it is — see useTopicBrowser's stale-while-
                    revalidate note. */}
                <Box sx={{px: 2, pb: 2, opacity: stale ? 0.65 : 1, transition: 'opacity 120ms'}}>
                    {loading && tree.length === 0 ? (
                        <Text variant="body2" color="text.secondary" sx={{py: 2}}>
                            Loading topics…
                        </Text>
                    ) : (
                        <>
                            <Text variant="caption" color="text.secondary" sx={{display: 'block', mb: 1}}>
                                Counts are the {countNoun} your current search would return. Topics with none are hidden.
                            </Text>
                            {tree.map((field) => (
                                <TopicNodeRow
                                    key={field.id}
                                    node={field}
                                    depth={0}
                                    counts={counts}
                                    selection={selection}
                                    onToggle={onToggle}
                                    onToggleExpanded={onToggleExpanded}
                                    matchedIds={matchedIds}
                                    expandedIds={expandedIds}
                                    searchText={searchText}
                                    atCap={atCap}
                                    firstMatchRef={(element) => {
                                        firstMatchElement.current = element
                                    }}
                                    firstMatchId={firstMatchId}
                                />
                            ))}
                        </>
                    )}
                </Box>
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose}>Done</Button>
            </DialogActions>
        </Dialog>
    )
}
