import {z} from 'zod'

// Contract for the `organisations` index (see hm_pipeline's
// export/mappings/organisations.json). Only the row shape exists today: it is
// what a project's organisations tab lists. The organisations entity of
// /search (its own search request, facets and detail) is a later slice and
// will extend this rather than declare a second shape.

const nullableString = z
    .string()
    .nullish()
    .transform((value) => value ?? null)
const nullableNumber = z
    .number()
    .nullish()
    .transform((value) => value ?? null)
const stringArray = z
    .array(z.string())
    .nullish()
    .transform((value) => value ?? [])

export const organisationRowSchema = z.object({
    id: z.string(),
    legalName: nullableString,
    legalShortName: nullableString,
    countryCode: nullableString,
    /** Has an `Unknown` bucket — 157k organisations are not placed in a region. */
    region: nullableString,
    /** ROR's institution types; `unknown` where ROR has no match. */
    rorTypes: stringArray,
    rorId: nullableString,
    websiteUrl: nullableString,
    /**
     * Whether the organisation has coordinates at all. The point itself is not
     * sent here (no map on this screen) — only ~18% of project-connected
     * organisations have one, so it is worth showing which.
     */
    hasGeo: z.boolean(),
    /** Global counts across the whole index, NOT counts within a project. */
    project_count: nullableNumber,
    work_count: nullableNumber,
    total_funding_eur: nullableNumber,
})
export type OrganisationRow = z.infer<typeof organisationRowSchema>
