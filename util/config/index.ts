export interface Config {
    cache: {
        dir: string
        TTL: number
    }
    reporting?: {
        dir: string
    }
}

const defaultConfig = {
    cache: {
        dir: "cache",
        TTL: 24 * 60 * 60 * 1000, // in ms
    },
    reporting: {
        dir: "reports",
    }
} satisfies Config

export default {
    cache: {
        dir: process.env.CACHE_DIR ?? defaultConfig.cache.dir,
        TTL: process.env.CACHE_TTL ? parseInt(process.env.CACHE_TTL) : defaultConfig.cache.TTL,
    },
    reporting: {
        dir: process.env.REPORT_DIR ?? defaultConfig.reporting.dir,
    }
} satisfies Config

