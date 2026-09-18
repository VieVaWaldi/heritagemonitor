import {getRequestConfig} from 'next-intl/server'

// Single locale for now — no [locale] route segment, no middleware. Messages
// are colocated per module (src/modules/<name>/messages/<locale>.json) and
// merged here, per apps/web/RULES.md #6/#8 (modules own their own stuff).
// Each file nests its content under a namespace key matching the module
// name (e.g. {"Health": {...}}), so merging can't collide.
//
// A future translation script globs **/messages/en.json, translates the
// values with an LLM, and writes <locale>.json next to each source file —
// this merge just needs to import the matching locale for every module.
export default getRequestConfig(async () => {
    const locale = 'en'

    const messages = {
        ...(await import(`../../common/messages/${locale}.json`)).default,
        ...(await import(`../../modules/home/messages/${locale}.json`)).default,
        ...(await import(`../../modules/health/messages/${locale}.json`)).default,
        ...(await import(`../../modules/search/minorities/messages/${locale}.json`)).default,
        ...(await import(`../../modules/notFound/messages/${locale}.json`)).default,
    }

    return {locale, messages}
})
