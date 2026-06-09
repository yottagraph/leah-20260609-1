<template>
    <div class="entity-properties">
        <div v-if="loading" class="d-flex justify-center align-center pa-8">
            <v-progress-circular indeterminate color="primary" />
        </div>

        <v-alert v-else-if="error" type="error" variant="tonal" closable class="mb-4">
            {{ error }}
        </v-alert>

        <div v-else-if="data">
            <div class="mb-4">
                <div class="text-overline text-medium-emphasis">Entity</div>
                <div class="text-h6">{{ data.name || data.neid }}</div>
                <code class="text-caption text-medium-emphasis">{{ data.neid }}</code>
            </div>

            <div class="d-flex ga-2 mb-4 flex-wrap">
                <v-chip size="small" variant="tonal" color="primary">
                    {{ data.propertyCount }} properties
                </v-chip>
                <v-chip size="small" variant="tonal"> {{ data.valueCount }} values total </v-chip>
            </div>

            <v-empty-state
                v-if="!data.properties.length"
                headline="No properties"
                icon="mdi-database-off-outline"
                size="small"
            />

            <div v-else class="property-list">
                <div v-for="g in data.properties" :key="g.pid" class="property-group">
                    <div class="property-name">
                        {{ g.name }}
                        <v-chip
                            v-if="g.values.length > 1"
                            size="x-small"
                            variant="tonal"
                            class="ml-2"
                        >
                            {{ g.values.length }}
                        </v-chip>
                        <span class="property-type">{{ g.type }}</span>
                    </div>
                    <div class="property-values">
                        <div
                            v-for="(v, i) in g.values"
                            :key="`${g.pid}-${i}`"
                            class="property-value"
                        >
                            <span
                                v-if="v.isReference && v.referenceNeid"
                                class="property-link"
                                @click="
                                    $emit('navigate', {
                                        neid: v.referenceNeid,
                                        name: v.value || v.referenceNeid,
                                    })
                                "
                            >
                                <v-icon size="x-small" class="mr-1"
                                    >mdi-arrow-right-circle-outline</v-icon
                                >
                                {{ v.value }}
                            </span>
                            <span v-else class="property-text">{{ v.value }}</span>
                            <span v-if="v.recordedAt" class="property-date">
                                {{ formatDate(v.recordedAt) }}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
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

    interface PropertiesData {
        neid: string;
        name: string | null;
        propertyCount: number;
        valueCount: number;
        properties: PropertyGroup[];
    }

    const props = defineProps<{
        neid: string | null;
    }>();

    defineEmits<{
        (e: 'navigate', target: { neid: string; name: string }): void;
    }>();

    const data = ref<PropertiesData | null>(null);
    const loading = ref(false);
    const error = ref<string | null>(null);

    async function load(neid: string) {
        loading.value = true;
        error.value = null;
        data.value = null;
        try {
            data.value = await $fetch<PropertiesData>(
                `/api/entity/${encodeURIComponent(neid)}/properties`
            );
        } catch (e: any) {
            error.value = e?.statusMessage || e?.message || 'Failed to load properties';
        } finally {
            loading.value = false;
        }
    }

    watch(
        () => props.neid,
        (n) => {
            if (n) load(n);
            else {
                data.value = null;
                error.value = null;
            }
        },
        { immediate: true }
    );

    function formatDate(s: string): string {
        try {
            const d = new Date(s);
            if (isNaN(d.getTime())) return s;
            return d.toISOString().slice(0, 10);
        } catch {
            return s;
        }
    }
</script>

<style scoped>
    .entity-properties {
        padding: 4px;
    }

    .property-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .property-group {
        padding: 12px 14px;
        background: rgba(255, 255, 255, 0.025);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 8px;
    }

    .property-name {
        font-family: var(--font-mono, monospace);
        font-size: 0.85rem;
        color: var(--lv-green, #5fd28a);
        margin-bottom: 8px;
        display: flex;
        align-items: center;
    }

    .property-type {
        margin-left: auto;
        font-size: 0.7rem;
        color: rgba(255, 255, 255, 0.4);
        font-family: var(--font-mono, monospace);
    }

    .property-values {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .property-value {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding: 4px 0;
        font-size: 0.9rem;
    }

    .property-text {
        color: rgba(255, 255, 255, 0.85);
        word-break: break-word;
        flex: 1;
    }

    .property-link {
        color: var(--lv-green, #5fd28a);
        cursor: pointer;
        flex: 1;
        word-break: break-word;
        display: inline-flex;
        align-items: center;
    }

    .property-link:hover {
        text-decoration: underline;
    }

    .property-date {
        font-family: var(--font-mono, monospace);
        font-size: 0.7rem;
        color: rgba(255, 255, 255, 0.4);
        flex-shrink: 0;
    }
</style>
