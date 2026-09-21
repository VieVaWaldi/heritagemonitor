'use client'

import type {QueryNetworkResponse} from '@heritagemonitor/shared'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Link from '@mui/material/Link'
import {FUNDING_AMOUNT_CAVEAT, formatCompactEur} from '../funding/fundingFormat'
import {Text} from '@/common/text'
import {clusterColorHex} from './clusterGraph'
import {hingeOtherClusters, type Cluster, type ClusterModel, type Share} from './clusters'

export interface ClusterOverviewTabProps {
    cluster: Cluster
    title: string
    subtitle: string
    network: QueryNetworkResponse
    model: ClusterModel
    titles: ReadonlyMap<string, {title: string}>
    /** Topic id -> readable name (falls back to the id). */
    topicLabel: (topicId: string) => string
    onOpenOrganisation: (organisationId: string) => void
    onSelectCluster: (id: string) => void
    onOpenBridges: () => void
}

function Section({title, children}: {title: string; children: React.ReactNode}) {
    return (
        <Box>
            <Text variant="overline" color="text.secondary" sx={{fontWeight: 600, display: 'block'}}>
                {title}
            </Text>
            {children}
        </Box>
    )
}

function Facts({cluster}: {cluster: Cluster}) {
    const facts = [
        `${cluster.members.length.toLocaleString('en-US')} organisations`,
        `${cluster.internalEdges.toLocaleString('en-US')} collaborations (${cluster.strength.toLocaleString('en-US')} shared projects)`,
        `${cluster.projects.length.toLocaleString('en-US')} projects`,
        cluster.years ? (cluster.years[0] === cluster.years[1] ? String(cluster.years[0]) : `${cluster.years[0]}–${cluster.years[1]}`) : null,
    ].filter(Boolean)
    return (
        <Box sx={{display: 'flex', flexWrap: 'wrap', gap: 0.75}}>
            {facts.map((fact) => (
                <Chip key={fact} label={fact} size="small" variant="outlined" />
            ))}
        </Box>
    )
}

/** Small proportional bars: label, a bar as wide as its share, the count. */
function ShareBars({shares, label}: {shares: Share[]; label?: (key: string) => string}) {
    if (shares.length === 0) {
        return (
            <Text variant="body2" color="text.secondary">
                Nothing recorded for these.
            </Text>
        )
    }
    return (
        <Box sx={{display: 'flex', flexDirection: 'column', gap: 0.75, mt: 0.5}}>
            {shares.map((share) => (
                <Box key={share.key} sx={{display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 90px 28px', alignItems: 'center', gap: 1}}>
                    <Text variant="body2" truncate>
                        {label ? label(share.key) : share.key}
                    </Text>
                    <Box sx={{height: 8, borderRadius: 4, backgroundColor: 'action.hover'}}>
                        <Box sx={{height: '100%', width: `${Math.max(4, Math.round(share.share * 100))}%`, borderRadius: 4, backgroundColor: 'primary.main'}} />
                    </Box>
                    <Text variant="caption" color="text.secondary" sx={{textAlign: 'right'}}>
                        {share.count}
                    </Text>
                </Box>
            ))}
        </Box>
    )
}

/**
 * The selected cluster in digestible form: what it is about, how big it is,
 * the money and years behind it, the top funders, countries and topics as
 * small bars, who leads it, and who links it to the other clusters.
 */
export function ClusterOverviewTab({cluster, title, subtitle, network, model, titles, topicLabel, onOpenOrganisation, onSelectCluster, onOpenBridges}: ClusterOverviewTabProps) {
    const spanning = model.hingeProjects.filter((placement) => placement.span.includes(cluster.id)).length

    return (
        <Box sx={{p: 2.5, display: 'flex', flexDirection: 'column', gap: 2.5}}>
            <Box sx={{display: 'flex', gap: 1.25, alignItems: 'flex-start'}}>
                <Box sx={{width: 14, height: 14, mt: 0.75, borderRadius: '50%', flexShrink: 0, backgroundColor: clusterColorHex(cluster.id)}} />
                <Box sx={{minWidth: 0}}>
                    <Text variant="h6">{title}</Text>
                    <Text variant="body2" color="text.secondary">
                        {subtitle}
                    </Text>
                </Box>
            </Box>

            <Facts cluster={cluster} />

            <Section title="Money">
                <Text variant="body2">
                    {cluster.funding > 0 ? `about ${formatCompactEur(cluster.funding)} across its projects` : 'No budget recorded for its projects.'}
                </Text>
                <Text variant="caption" color="text.secondary" sx={{display: 'block'}}>
                    A project counts once, whole, in the cluster holding most of its organisations. {FUNDING_AMOUNT_CAVEAT}
                </Text>
            </Section>

            <Section title="Top funders">
                <ShareBars shares={cluster.topFunders} />
            </Section>
            <Section title="Top countries">
                <ShareBars shares={cluster.topCountries} />
            </Section>
            <Section title="Top topics">
                <ShareBars shares={cluster.topTopics} label={topicLabel} />
            </Section>

            <Section title="Lead organisations">
                <Box sx={{display: 'flex', flexDirection: 'column', gap: 0.5, mt: 0.5}}>
                    {cluster.leads.map((lead) => {
                        const node = network.nodes[lead.node]
                        return (
                            <Text key={node.id} variant="body2">
                                <Link component="button" type="button" onClick={() => onOpenOrganisation(node.id)} sx={{textAlign: 'left'}}>
                                    {node.name}
                                </Link>
                                {' — '}
                                {[node.countryCode, `${lead.weight.toLocaleString('en-US')} shared project${lead.weight === 1 ? '' : 's'} inside the cluster`].filter(Boolean).join(', ')}
                            </Text>
                        )
                    })}
                </Box>
            </Section>

            <Section title="Bridges">
                {cluster.hingeNodes.length === 0 && spanning === 0 ? (
                    <Text variant="body2" color="text.secondary">
                        Nothing in this network links this cluster to another one.
                    </Text>
                ) : (
                    <Box sx={{display: 'flex', flexDirection: 'column', gap: 0.75, mt: 0.5}}>
                        {cluster.hingeNodes.map((nodeIndex) => {
                            const hinge = model.hinges.find((entry) => entry.node === nodeIndex)!
                            const others = hingeOtherClusters(hinge, cluster.id)
                            return (
                                <Text key={nodeIndex} variant="body2">
                                    <Link component="button" type="button" onClick={() => onOpenOrganisation(network.nodes[nodeIndex].id)} sx={{textAlign: 'left'}}>
                                        {network.nodes[nodeIndex].name}
                                    </Link>
                                    {' connects to '}
                                    {others.map((entry, index) => (
                                        <span key={entry.cluster}>
                                            {index > 0 && ', '}
                                            <Link component="button" type="button" onClick={() => onSelectCluster(entry.cluster)}>
                                                {titles.get(entry.cluster)?.title ?? `Cluster ${entry.cluster}`}
                                            </Link>
                                        </span>
                                    ))}
                                </Text>
                            )
                        })}
                        {spanning > 0 && (
                            <Text variant="body2" color="text.secondary">
                                {spanning.toLocaleString('en-US')} project{spanning === 1 ? '' : 's'} span this cluster and another.{' '}
                                <Link component="button" type="button" onClick={onOpenBridges}>
                                    See all bridges
                                </Link>
                            </Text>
                        )}
                    </Box>
                )}
            </Section>
        </Box>
    )
}
