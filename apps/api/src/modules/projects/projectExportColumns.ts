import type {ProjectDetail} from '@heritagemonitor/shared'

// One export row per project, grouped into sections rather than the schema's
// own field order: project identity, descriptive metadata, funding, derived
// enrichments, relations, then topic classification (topic_name/subfield_name/
// field_name/domain_name are resolved names shown only when asked for,
// interleaved right after their id column).
export function toProjectExportRow(detail: ProjectDetail, opts: {includeTopic: boolean}): Record<string, unknown> {
    const row: Record<string, unknown> = {
        // project level
        id: detail.id,
        doi: detail.doi,
        grantId: detail.grantId,
        openaireId: detail.openaireId,

        acronym: detail.acronym,
        title: detail.title,
        year: detail.year,
        startDate: detail.startDate,
        endDate: detail.endDate,

        websiteUrl: detail.websiteUrl,
        summary: detail.summary,
        keywords: detail.keywords,
        subjects: detail.subjects,
        openAccessMandateForPublications: detail.openAccessMandateForPublications,
        openAccessMandateForDataset: detail.openAccessMandateForDataset,

        callIdentifier: detail.callIdentifier,
        funder: detail.funder,
        funder_names: detail.funder_names,
        funding_stream_ids: detail.funding_stream_ids,
        programme: detail.programme,
        frameworkProgrammes: detail.frameworkProgrammes,
        funded_amount_eur: detail.funded_amount_eur,
        currency: detail.currency,
        funded_amount: detail.funded_amount,
        funded_eur_per_org: detail.funded_eur_per_org,

        // enrichments
        is_ch: detail.is_ch,
        pred: detail.pred,
        is_translated: detail.is_translated,
        pillar_list: detail.pillar_list,
        theme: detail.theme,

        // relations
        minority_qids: detail.minority_qids,
        work_count: detail.work_count,
        org_count: detail.org_count,
        coordinator_ids: detail.coordinator_ids,
        org_ids: detail.org_ids,
        org_names: detail.org_names,
        org_regions: detail.org_regions,
        org_countries: detail.org_countries,

        // topics
        topic_id: detail.topic_id,
    }

    if (opts.includeTopic) row.topic_name = detail.topic?.topic_name ?? null

    row.subfield_id = detail.subfield_id
    if (opts.includeTopic) row.subfield_name = detail.topic?.subfield_name ?? null

    row.field_id = detail.field_id
    if (opts.includeTopic) row.field_name = detail.topic?.field_name ?? null

    row.domain_id = detail.domain_id
    if (opts.includeTopic) row.domain_name = detail.topic?.domain_name ?? null

    return row
}
