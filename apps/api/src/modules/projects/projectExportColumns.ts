import type {ProjectDetail} from '@heritagemonitor/shared'

// One export row per project: every ProjectDetail field in the schema's own
// order, except the resolved `topic` object, which becomes four flat name
// columns only when asked for (`topic_id` is always there).
export function toProjectExportRow(detail: ProjectDetail, opts: {includeTopic: boolean}): Record<string, unknown> {
    const row: Record<string, unknown> = {
        id: detail.id,
        acronym: detail.acronym,
        title: detail.title,
        year: detail.year,
        funder: detail.funder,
        programme: detail.programme,
        funded_amount_eur: detail.funded_amount_eur,
        is_ch: detail.is_ch,
        org_count: detail.org_count,
        work_count: detail.work_count,
        topic_id: detail.topic_id,
        coordinator_ids: detail.coordinator_ids,
        doi: detail.doi,
        grantId: detail.grantId,
        openaireId: detail.openaireId,
        websiteUrl: detail.websiteUrl,
        summary: detail.summary,
        keywords: detail.keywords,
        subjects: detail.subjects,
        callIdentifier: detail.callIdentifier,
        startDate: detail.startDate,
        endDate: detail.endDate,
        openAccessMandateForPublications: detail.openAccessMandateForPublications,
        openAccessMandateForDataset: detail.openAccessMandateForDataset,
        frameworkProgrammes: detail.frameworkProgrammes,
        currency: detail.currency,
        funded_amount: detail.funded_amount,
        funded_eur_per_org: detail.funded_eur_per_org,
        is_translated: detail.is_translated,
        pred: detail.pred,
        minority_qids: detail.minority_qids,
        pillar_list: detail.pillar_list,
        theme: detail.theme,
        subfield_id: detail.subfield_id,
        field_id: detail.field_id,
        domain_id: detail.domain_id,
        org_ids: detail.org_ids,
        org_names: detail.org_names,
        org_regions: detail.org_regions,
        org_countries: detail.org_countries,
        funder_names: detail.funder_names,
        funding_stream_ids: detail.funding_stream_ids,
    }

    if (opts.includeTopic) {
        row.topic_name = detail.topic?.topic_name ?? null
        row.subfield_name = detail.topic?.subfield_name ?? null
        row.field_name = detail.topic?.field_name ?? null
        row.domain_name = detail.topic?.domain_name ?? null
    }

    return row
}
