import { isQsConfigured, qsFetch } from '~/server/utils/elementalQs';

export default defineEventHandler(async (event) => {
    const q = String(getQuery(event).q ?? '').trim();
    if (!q) return { matches: [] };
    if (!isQsConfigured()) {
        throw createError({ statusCode: 503, statusMessage: 'Query Server not configured' });
    }

    const res = (await qsFetch('entities/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            queries: [{ queryId: 1, query: q }],
            maxResults: 12,
            includeNames: true,
            includeFlavors: true,
        }),
        timeout: 20000,
    })) as any;

    const matches = (res?.results?.[0]?.matches ?? []).map((m: any) => ({
        neid: String(m?.neid ?? ''),
        name: String(m?.name ?? m?.neid ?? ''),
        flavor: m?.flavor ? String(m.flavor) : null,
        score: typeof m?.score === 'number' ? m.score : null,
    }));
    return { matches };
});
