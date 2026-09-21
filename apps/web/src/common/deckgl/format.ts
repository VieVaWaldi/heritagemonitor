const currency = new Intl.NumberFormat('en', {style: 'currency', currency: 'EUR', notation: 'compact', maximumFractionDigits: 1})

// EU framework-programme money, hence EUR.
export function formatFunding(amount: number): string {
    return currency.format(amount)
}

export function formatCount(count: number, singular: string, plural = `${singular}s`): string {
    return `${count} ${count === 1 ? singular : plural}`
}

export function formatDateRange(start: string | null, end: string | null): string {
    const from = start?.slice(0, 4)
    const to = end?.slice(0, 4)
    if (!from && !to) return 'Dates unknown'
    return `${from ?? '?'} – ${to ?? '?'}`
}
