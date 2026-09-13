import type {NextConfig} from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const nextConfig: NextConfig = {
    // Prod Docker image only needs .next/standalone + .next/static + public —
    // not the full node_modules tree. No effect on `next dev`. Turbopack is
    // the default dev/build engine as of Next.js 16 — no flag needed. Revisit
    // when MUI's App Router integration or a future dependency requires
    // specific config here.
    output: 'standalone',
}

const withNextIntl = createNextIntlPlugin('./src/common/i18n/request.ts')

export default withNextIntl(nextConfig)
