import {OrganisationDetail} from './detail/OrganisationDetail'
import type {Visualization} from './explorerTypes'
import {formatCount, formatFunding} from './format'
import {hexBinsFromOrganisations, type HexBin} from './hexBins'
import {createHexFundingLayer} from './hexFundingLayer'
import {organisationsFromEdges} from './organisations'

export const hexesVisualization: Visualization = {
    id: 'hexes',
    label: 'Funding hexagons',
    title: 'Funding by area',
    description: 'Hexagon height and colour show the summed funding of the organisations inside',
    itemNoun: 'organisations',
    emptyDetailHint: 'Select an organisation from the list or click a hexagon on the map.',
    prepare: (edges) => {
        const organisations = organisationsFromEdges(edges)
        const bins = hexBinsFromOrganisations(organisations)
        const binByOrganisationId = new Map<string, HexBin>()
        for (const bin of bins) for (const org of bin.organisations) binByOrganisationId.set(org.id, bin)

        return {
            items: organisations.map((org) => ({
                id: org.id,
                title: org.name,
                subtitle: [formatFunding(org.funding), formatCount(org.projects.length, 'project'), org.country]
                    .filter(Boolean)
                    .join(' · '),
                renderDetail: (select) => (
                    <OrganisationDetail
                        organisation={org}
                        neighbours={binByOrganisationId.get(org.id)?.organisations.filter((o) => o.id !== org.id) ?? []}
                        onSelectOrganisation={select}
                    />
                ),
            })),
            createLayers: (colors, {selectedId, onSelect}) => [
                createHexFundingLayer({
                    id: 'funding-hexes',
                    data: bins,
                    lowColorHex: colors.primaryLight,
                    highColorHex: colors.secondary,
                    highlightColorHex: colors.highlight,
                    selectedHex: selectedId ? (binByOrganisationId.get(selectedId)?.hex ?? null) : null,
                    // A hexagon holds several organisations; select its biggest one.
                    onClick: (info) => {
                        if (info.object) onSelect(info.object.organisations[0].id)
                    },
                }),
            ],
        }
    },
}
