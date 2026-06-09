/**
 * One-hop graph neighbors for an entity.
 *
 * Combines `incoming` and `outgoing` `linked` traversals (graph layer),
 * de-duplicates NEIDs, then batch-resolves display names via
 * `POST /entities/names`.
 *
 * Flavor labels are not included — the QS REST surface doesn't expose a
 * batch flavor endpoint, and re-issuing `entities/search` per name is
 * wasteful. The UI just shows the resolved names.
 */
import { isQsConfigured, qsFetch, padNeid } from '~/server/utils/elementalQs';

interface Neighbor {
    neid: string;
    name: string;
    direction: 'incoming' | 'outgoing' | 'both';
}

export default defineEventHandler(async (event) => {
    const neidRaw = getRouterParam(event, 'neid');
    if (!neidRaw) {
        throw createError({ statusCode: 400, statusMessage: 'neid is required' });
    }
    const neid = padNeid(neidRaw);
    if (!isQsConfigured()) {
        throw createError({ statusCode: 503, statusMessage: 'Query Server not configured' });
    }

    const limit = Math.max(1, Math.min(50, Number(getQuery(event).limit ?? 25)));

    const findLinked = async (direction: 'incoming' | 'outgoing'): Promise<string[]> => {
        try {
            const form = new URLSearchParams();
            form.set(
                'expression',
                JSON.stringify({
                    type: 'linked',
                    linked: { to_entity: neid, distance: 1, direction },
                })
            );
            form.set('limit', String(limit));
            const res = (await qsFetch('elemental/find', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: form.toString(),
                timeout: 20000,
            })) as any;
            return (res?.eids ?? []).map((e: unknown) => padNeid(String(e)));
        } catch {
            return [];
        }
    };

    const [incoming, outgoing] = await Promise.all([
        findLinked('incoming'),
        findLinked('outgoing'),
    ]);

    const dirByNeid = new Map<string, 'incoming' | 'outgoing' | 'both'>();
    for (const n of incoming) dirByNeid.set(n, 'incoming');
    for (const n of outgoing) {
        if (n === neid) continue;
        dirByNeid.set(n, dirByNeid.has(n) ? 'both' : 'outgoing');
    }
    dirByNeid.delete(neid);
    const allNeids = [...dirByNeid.keys()];

    let nameByNeid: Record<string, string> = {};
    if (allNeids.length) {
        try {
            const res = (await qsFetch('entities/names', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ neids: allNeids }),
                timeout: 20000,
            })) as { results?: Record<string, string> };
            nameByNeid = res?.results ?? {};
        } catch {
            nameByNeid = {};
        }
    }

    const neighbors: Neighbor[] = allNeids.map((n) => ({
        neid: n,
        name: nameByNeid[n] || n,
        direction: dirByNeid.get(n) || 'incoming',
    }));

    neighbors.sort((a, b) => a.name.localeCompare(b.name));

    return {
        neid,
        counts: {
            incoming: incoming.length,
            outgoing: outgoing.filter((n) => n !== neid).length,
            unique: neighbors.length,
        },
        neighbors,
    };
});
