import type {WorkDetail} from '@heritagemonitor/shared'

// One export row per work: every WorkDetail field in the schema's own order.
// Listed explicitly so the column set is a decision here, not whatever the
// schema happens to carry next.
export function toWorkExportRow(detail: WorkDetail): Record<string, unknown> {
    return {
        id: detail.id,
        title: detail.title,
        authors: detail.authors,
        author_count: detail.author_count,
        year: detail.year,
        publisher: detail.publisher,
        container_name: detail.container_name,
        open_access_color: detail.open_access_color,
        citation_count: detail.citation_count,
        doi: detail.doi,
        pdf_url: detail.pdf_url,
        landing_url: detail.landing_url,
        is_ch_via_project: detail.is_ch_via_project,
        publication_date: detail.publication_date,
        best_access_right: detail.best_access_right,
        language: detail.language,
        org_count: detail.org_count,
        link_tier: detail.link_tier,
        project_ids: detail.project_ids,
        organisation_ids: detail.organisation_ids,
        minority_qids: detail.minority_qids,
    }
}
