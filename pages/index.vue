<template>
    <v-container fluid class="fill-height pa-0 app-scroll-locked">
        <div class="d-flex flex-column" style="height: 100%; width: 100%">
            <div class="flex-shrink-0 d-flex flex-column align-center pa-4 search-area">
                <h1 class="page-title mb-2">Entity Explorer</h1>
                <p class="page-subtitle mb-4">
                    Search the knowledge graph and traverse one-hop relationships
                </p>
                <EntitySearch @selected="onSelected" />
                <div v-if="focus" class="mt-3 d-flex ga-2 align-center flex-wrap justify-center">
                    <v-chip
                        v-if="historyChips.length > 1"
                        size="small"
                        variant="tonal"
                        prepend-icon="mdi-history"
                    >
                        {{ historyChips.length }} in history
                    </v-chip>
                    <v-btn
                        v-if="historyChips.length > 1"
                        size="small"
                        variant="text"
                        prepend-icon="mdi-arrow-left"
                        @click="goBack"
                    >
                        Back
                    </v-btn>
                    <v-btn
                        size="small"
                        variant="text"
                        prepend-icon="mdi-information-outline"
                        @click="propsOpen = true"
                    >
                        Properties
                    </v-btn>
                    <v-chip
                        v-if="counts"
                        size="small"
                        variant="tonal"
                        :color="counts.unique ? 'primary' : 'grey'"
                    >
                        {{ counts.unique }} neighbors
                    </v-chip>
                    <v-chip v-if="counts && counts.incoming" size="x-small" variant="text">
                        {{ counts.incoming }} incoming
                    </v-chip>
                    <v-chip v-if="counts && counts.outgoing" size="x-small" variant="text">
                        {{ counts.outgoing }} outgoing
                    </v-chip>
                </div>
            </div>

            <div class="flex-grow-1 graph-area">
                <v-progress-linear v-if="neighborsLoading" indeterminate color="primary" />
                <v-alert
                    v-if="error"
                    type="error"
                    variant="tonal"
                    closable
                    class="ma-4"
                    @click:close="error = null"
                >
                    {{ error }}
                </v-alert>

                <EntityGraph
                    :focus="focus"
                    :neighbors="neighbors"
                    @focus-node="onSelected"
                    @focus-click="propsOpen = true"
                />
            </div>
        </div>

        <v-navigation-drawer v-model="propsOpen" location="right" temporary width="480">
            <div class="pa-4">
                <div class="d-flex align-center mb-4">
                    <v-icon class="mr-2">mdi-information-outline</v-icon>
                    <span class="text-h6">Properties</span>
                    <v-spacer />
                    <v-btn
                        icon="mdi-close"
                        variant="text"
                        size="small"
                        @click="propsOpen = false"
                    />
                </div>
                <EntityProperties
                    :neid="focus?.neid ?? null"
                    @navigate="onNavigateFromProperties"
                />
            </div>
        </v-navigation-drawer>
    </v-container>
</template>

<script setup lang="ts">
    interface Entity {
        neid: string;
        name: string;
    }

    interface Neighbor {
        neid: string;
        name: string;
        direction: 'incoming' | 'outgoing' | 'both';
    }

    const focus = ref<Entity | null>(null);
    const neighbors = ref<Neighbor[]>([]);
    const counts = ref<{ incoming: number; outgoing: number; unique: number } | null>(null);
    const neighborsLoading = ref(false);
    const error = ref<string | null>(null);
    const propsOpen = ref(false);
    const history = ref<Entity[]>([]);

    const historyChips = computed(() => history.value);

    async function focusOn(entity: Entity, pushHistory = true) {
        focus.value = entity;
        if (pushHistory) {
            const last = history.value[history.value.length - 1];
            if (!last || last.neid !== entity.neid) {
                history.value.push(entity);
            }
        }
        await loadNeighbors(entity.neid);
    }

    async function loadNeighbors(neid: string) {
        neighborsLoading.value = true;
        error.value = null;
        neighbors.value = [];
        counts.value = null;
        try {
            const res = await $fetch<{
                neid: string;
                counts: { incoming: number; outgoing: number; unique: number };
                neighbors: Neighbor[];
            }>(`/api/entity/${encodeURIComponent(neid)}/neighbors`);
            neighbors.value = res.neighbors;
            counts.value = res.counts;
        } catch (e: any) {
            error.value = e?.statusMessage || e?.message || 'Failed to load neighbors';
        } finally {
            neighborsLoading.value = false;
        }
    }

    function onSelected(entity: Entity) {
        focusOn(entity);
    }

    function onNavigateFromProperties(target: Entity) {
        focusOn(target);
    }

    function goBack() {
        if (history.value.length < 2) return;
        history.value.pop();
        const prev = history.value[history.value.length - 1];
        if (prev) focusOn(prev, false);
    }
</script>

<style scoped>
    .search-area {
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.02), transparent);
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }

    .page-title {
        font-family: var(--font-headline, sans-serif);
        font-weight: 400;
        font-size: 1.4rem;
        letter-spacing: 0.04em;
        color: #fff;
    }

    .page-subtitle {
        color: var(--lv-silver, #9aa0a6);
        font-size: 0.9rem;
        margin: 0;
    }

    .graph-area {
        position: relative;
        overflow: hidden;
        display: flex;
        flex-direction: column;
    }
</style>
