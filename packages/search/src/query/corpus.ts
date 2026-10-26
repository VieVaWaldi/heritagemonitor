/**
 * SCI/DCH is one choice in the UI but a different field per index — this is
 * the one place that mapping lives. Port of the `corpus == "DCH"` branches
 * spread across export/queries.py's filter builders.
 *
 * `science` is the whole corpus (no filter); `dch` narrows it. Works only
 * know DCH through their linked project, which is why the UI labels that
 * filter "via linked project".
 */
export type Corpus = 'science' | 'dch'

export type CorpusEntity = 'projects' | 'organisations' | 'works' | 'minorities' | 'grants'

interface DchClause {
    [clause: string]: Record<string, unknown>
}

const DCH_FILTER: Record<CorpusEntity, DchClause> = {
    projects: {term: {is_ch: true}},
    organisations: {term: {has_dch_project: true}},
    works: {term: {is_ch_via_project: true}},
    minorities: {range: {dch_project_count: {gte: 1}}},
    grants: {range: {dch_project_count: {gte: 1}}},
}

export function corpusFilter(entity: CorpusEntity, corpus: Corpus | undefined): DchClause[] {
    return corpus === 'dch' ? [DCH_FILTER[entity]] : []
}
