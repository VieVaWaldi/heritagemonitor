import {db, schema} from '@heritagemonitor/db'
import {desc} from 'drizzle-orm'

// Repository layer: raw data access only, no business logic.
// This is the ONLY file in this module allowed to import @heritagemonitor/db.
// See RULES.md rule 3 (layer separation) and rule 5 (domain entities).

export async function getLatestHealthCheck() {
    const [row] = await db
        .select()
        .from(schema.healthChecks)
        .orderBy(desc(schema.healthChecks.createdAt))
        .limit(1)

    return row ?? null
}

export async function insertHealthCheck(message: string) {
    const [row] = await db
        .insert(schema.healthChecks)
        .values({message})
        .returning()

    return row
}