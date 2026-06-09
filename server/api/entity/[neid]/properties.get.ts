/**
 * All properties for a single entity.
 *
 * Fetches every property value via the form-encoded
 * `elemental/entities/properties` endpoint with an empty `pids` array,
 * deduplicates by (pid, value) keeping the most recently `recorded_at`
 * value first per pid, resolves any `data_nindex` reference values to
 * the linked entity's display name, and groups the result by property
 * name for easy rendering.
 */
import {
    isQsConfigured,
    qsFetch,
    getQsSchema,
    padNeid,
    resolveEntityNames,
} from '~/server/utils/elementalQs';

interface PropertyValue {
    value: string | null;
    raw: string | null;
    recordedAt: string | null;
    isReference: boolean;
    referenceNeid: string | null;
}

interface PropertyGroup {
    pid: string;
    name: string;
    type: string;
    values: PropertyValue[];
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

    const schema = await getQsSchema();

    const form = new URLSearchParams();
    form.set('eids', JSON.stringify([neid]));
    form.set('pids', '[]');

    const res = (await qsFetch('elemental/entities/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form.toString(),
        timeout: 30000,
    })) as any;

    const rows: any[] = res?.values ?? [];

    const groupedByPid = new Map<string, any[]>();
    for (const r of rows) {
        const pid = String(r?.pid ?? '');
        if (!pid) continue;
        const arr = groupedByPid.get(pid) ?? [];
        arr.push(r);
        groupedByPid.set(pid, arr);
    }

    const refNeids = new Set<string>();
    for (const [pid, group] of groupedByPid) {
        const type = schema.typeByPid.get(pid) || '';
        if (type !== 'data_nindex') continue;
        for (const r of group) {
            if (r?.value === null || r?.value === undefined) continue;
            refNeids.add(padNeid(String(r.value)));
        }
    }

    const nameByNeid =
        refNeids.size > 0
            ? await resolveEntityNames([...refNeids])
            : ({} as Record<string, string>);

    const groups: PropertyGroup[] = [];
    for (const [pid, rawValues] of groupedByPid) {
        const seen = new Set<string>();
        const sorted = [...rawValues].sort((a, b) => {
            const ta = String(a?.recorded_at ?? '');
            const tb = String(b?.recorded_at ?? '');
            return tb.localeCompare(ta);
        });

        const type = schema.typeByPid.get(pid) || '';
        const isRef = type === 'data_nindex';
        const values: PropertyValue[] = [];
        for (const r of sorted) {
            if (r?.value === null || r?.value === undefined) continue;
            const rawStr = String(r.value);
            if (seen.has(rawStr)) continue;
            seen.add(rawStr);

            if (isRef) {
                const padded = padNeid(rawStr);
                values.push({
                    value: nameByNeid[padded] ?? padded,
                    raw: padded,
                    recordedAt: r?.recorded_at ? String(r.recorded_at) : null,
                    isReference: true,
                    referenceNeid: padded,
                });
            } else {
                values.push({
                    value: rawStr,
                    raw: rawStr,
                    recordedAt: r?.recorded_at ? String(r.recorded_at) : null,
                    isReference: false,
                    referenceNeid: null,
                });
            }
            if (values.length >= 10) break;
        }

        const meta = [...schema.pidByName.entries()].find(([, v]) => v.pid === pid);
        const name = meta?.[0] ?? `pid:${pid}`;

        groups.push({ pid, name, type, values });
    }

    groups.sort((a, b) => {
        const aHasName = a.name === 'name' ? -1 : 0;
        const bHasName = b.name === 'name' ? -1 : 0;
        if (aHasName !== bHasName) return aHasName - bHasName;
        return a.name.localeCompare(b.name);
    });

    let displayName: string | null = null;
    const nameGroup = groups.find((g) => g.name === 'name');
    if (nameGroup && nameGroup.values.length) {
        displayName = nameGroup.values[0].value;
    }
    if (!displayName) {
        try {
            const r = (await qsFetch(`entities/${neid}/name`, { timeout: 10000 })) as {
                name?: string;
            };
            if (r?.name) displayName = r.name;
        } catch {
            displayName = null;
        }
    }

    return {
        neid,
        name: displayName,
        propertyCount: groups.length,
        valueCount: rows.length,
        properties: groups,
    };
});
