'use client'

import type {MinorityDto} from '@heritagemonitor/shared'
import Box from '@mui/material/Box'
import Link from '@mui/material/Link'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import {Text} from '@/common/text'
import {wikidataUrl} from './minorityFormat'

export interface MinoritySubgroupsTabProps {
    minority: MinorityDto
}

const MAX_SUBGROUPS = 5
const ROW_HEIGHT = 48

// The natural analog of a project's "Deliverables" tab — known_subgroups is
// already structured as {name, qid}[], so this is just a list, not a
// PaginatedList (13/304 groups have any subgroups at all, so real
// pagination would be dead weight). Rows are read-only (name + external
// Wikidata link) rather than clickable: a subgroup qid isn't a standalone
// document in the `minorities` index (hm_pipeline's staging_2.py rolls it
// into its parent's known_subgroups column instead of keeping it as its own
// top-level entry), so there's nothing in HeritageMonitor's own data to
// pivot the panel to.
export function MinoritySubgroupsTab({minority}: MinoritySubgroupsTabProps) {
    if (!minority.has_subgroups || minority.known_subgroups.length === 0) {
        return (
            <Box sx={{height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2.5}}>
                <Text variant="body2" color="text.secondary" sx={{textAlign: 'center'}}>
                    This group has no documented subgroups in Wikidata.
                </Text>
            </Box>
        )
    }

    return (
        <Box sx={{py: 0.5}}>
            {minority.known_subgroups.slice(0, MAX_SUBGROUPS).map((subgroup) => (
                <Box
                    key={subgroup.qid}
                    sx={{
                        height: ROW_HEIGHT,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 1,
                        px: 2.5,
                    }}
                >
                    <Text variant="body2" truncate>
                        {subgroup.name}
                    </Text>
                    <Link
                        href={wikidataUrl(subgroup.qid)}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{display: 'inline-flex', alignItems: 'center', gap: 0.5, fontSize: '0.8125rem', flexShrink: 0}}
                    >
                        Wikidata <OpenInNewIcon fontSize="inherit" />
                    </Link>
                </Box>
            ))}
        </Box>
    )
}
