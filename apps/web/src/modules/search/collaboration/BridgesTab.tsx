'use client'

import type {ProjectSearchResponse, QueryNetworkResponse} from '@heritagemonitor/shared'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Link from '@mui/material/Link'
import ListItemButton from '@mui/material/ListItemButton'
import {Text} from '@/common/text'
import {clusterColorHex} from './clusterGraph'
import type {ClusterModel, ProjectPlacement} from './clusters'

export interface BridgesTabProps {
    network: QueryNetworkResponse
    model: ClusterModel
    titles: ReadonlyMap<string, {title: string}>
    /** Titles of the top bridge projects, fetched by id and already in ranking order. */
    projects: Array<ProjectSearchResponse['hits'][number] | undefined>
    /** Which placements `projects` are, in the same order. */
    projectPlacements: ProjectPlacement[]
    onOpenOrganisation: (organisationId: string) => void
    onOpenProject: (projectId: string) => void
    onSelectCluster: (id: string) => void
}

/** Hinge organisations listed, and bridge projects whose titles are fetched. */
export const BRIDGE_LIST_LIMIT = 10

function ClusterChips({ids, titles, onSelect}: {ids: string[]; titles: ReadonlyMap<string, {title: string}>; onSelect: (id: string) => void}) {
    return (
        <Box sx={{display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5}}>
            {ids.map((id) => (
                <Chip
                    key={id}
                    size="small"
                    variant="outlined"
                    onClick={() => onSelect(id)}
                    label={`${id}. ${titles.get(id)?.title ?? `Cluster ${id}`}`}
                    avatar={<Box sx={{width: 10, height: 10, borderRadius: '50%', backgroundColor: clusterColorHex(id)}} />}
                    sx={{maxWidth: 240}}
                />
            ))}
        </Box>
    )
}

/**
 * The bridges across ALL clusters: the organisations that hold several of them
 * together (highest participation first) and the projects that span them. The
 * question this answers is who to talk to when you want to cross from one
 * research community into another.
 */
export function BridgesTab({network, model, titles, projects, projectPlacements, onOpenOrganisation, onOpenProject, onSelectCluster}: BridgesTabProps) {
    return (
        <Box sx={{p: 2.5, display: 'flex', flexDirection: 'column', gap: 2.5}}>
            <Box>
                <Text variant="overline" color="text.secondary" sx={{fontWeight: 600, display: 'block'}}>
                    Bridge organisations
                </Text>
                {model.hinges.length === 0 ? (
                    <Text variant="body2" color="text.secondary">
                        No organisation works with several clusters at once here.
                    </Text>
                ) : (
                    model.hinges.slice(0, BRIDGE_LIST_LIMIT).map((hinge) => {
                        const node = network.nodes[hinge.node]
                        return (
                            <Box key={node.id} sx={{py: 0.75, borderBottom: 1, borderColor: 'divider'}}>
                                <Text variant="body2">
                                    <Link component="button" type="button" onClick={() => onOpenOrganisation(node.id)} sx={{textAlign: 'left', fontWeight: 500}}>
                                        {node.name}
                                    </Link>
                                    {node.countryCode ? ` · ${node.countryCode}` : ''}
                                </Text>
                                <Text variant="caption" color="text.secondary">
                                    {hinge.degree} collaborations across {hinge.clusters.length} clusters (participation {hinge.participation.toFixed(2)})
                                </Text>
                                <ClusterChips ids={hinge.clusters.map((entry) => entry.cluster)} titles={titles} onSelect={onSelectCluster} />
                            </Box>
                        )
                    })
                )}
            </Box>

            <Box>
                <Text variant="overline" color="text.secondary" sx={{fontWeight: 600, display: 'block'}}>
                    Bridge projects
                </Text>
                {model.hingeProjects.length === 0 ? (
                    <Text variant="body2" color="text.secondary">
                        No project spans more than one cluster.
                    </Text>
                ) : (
                    projectPlacements.map((placement, index) => {
                        const project = projects[index]
                        return (
                            <ListItemButton key={placement.project} divider disabled={!project} onClick={() => project && onOpenProject(project.id)} sx={{display: 'block', px: 0}}>
                                <Text variant="body2" truncate sx={{color: 'primary.main', fontWeight: 500}}>
                                    {project ? (project.acronym && project.title ? `${project.acronym} — ${project.title}` : (project.title ?? project.acronym ?? project.id)) : 'Loading…'}
                                </Text>
                                <Text variant="caption" color="text.secondary">
                                    {placement.organisations} organisations, {placement.span.length} clusters
                                </Text>
                                <ClusterChips ids={placement.span} titles={titles} onSelect={onSelectCluster} />
                            </ListItemButton>
                        )
                    })
                )}
                {model.hingeProjects.length > BRIDGE_LIST_LIMIT && (
                    <Text variant="caption" color="text.secondary" sx={{display: 'block', mt: 1}}>
                        The {BRIDGE_LIST_LIMIT} widest of {model.hingeProjects.length.toLocaleString('en-US')} bridge projects.
                    </Text>
                )}
            </Box>
        </Box>
    )
}
