'use client'

import type {MinorityDto} from '@heritagemonitor/shared'
import Box from '@mui/material/Box'
import {RelatedList, type RelatedRow} from '../entity/RelatedList'
import {Text} from '@/common/text'
import {wikidataUrl} from './minorityFormat'

export interface MinoritySubgroupsTabProps {
    minority: MinorityDto
    /** Opens this subgroup as the selected group, when it is itself indexed. */
    onSelectSubgroup: (qid: string) => void
    /** The qids this index actually holds, so only those become links. */
    indexedQids: ReadonlySet<string>
}

/**
 * The subgroups Wikidata records for this group. Most are not themselves
 * indexed minority groups, so a row only becomes a link when it is — the rest
 * are shown with their Wikidata id, which is all that is known about them.
 */
export function MinoritySubgroupsTab({minority, onSelectSubgroup, indexedQids}: MinoritySubgroupsTabProps) {
    if (!minority.has_subgroups || minority.known_subgroups.length === 0) {
        return (
            <Box sx={{height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2.5}}>
                <Text variant="body2" color="text.secondary" sx={{textAlign: 'center'}}>
                    No subgroups are documented for {minority.group_name_en}.
                </Text>
            </Box>
        )
    }

    const rows: RelatedRow[] = minority.known_subgroups.map((subgroup) => ({
        id: subgroup.qid,
        primary: subgroup.name,
        secondary: indexedQids.has(subgroup.qid)
            ? `${subgroup.qid} · open this group`
            : `${subgroup.qid} · not indexed separately (${wikidataUrl(subgroup.qid)})`,
    }))

    return (
        <RelatedList
            caption={`${minority.known_subgroups.length} documented subgroups`}
            rows={rows}
            page={1}
            pageCount={1}
            onPageChange={() => {}}
            loading={false}
            emptyMessage="No subgroups are documented for this group."
            onSelect={(qid) => {
                if (indexedQids.has(qid)) onSelectSubgroup(qid)
            }}
        />
    )
}
