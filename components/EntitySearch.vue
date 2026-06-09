<template>
    <div class="entity-search">
        <v-text-field
            v-model="query"
            :label="label"
            :prepend-inner-icon="icon"
            variant="solo-filled"
            rounded="lg"
            clearable
            density="comfortable"
            hide-details
            :loading="searching"
            autofocus
            @focus="showMenu = suggestions.length > 0"
            @click:clear="onClear"
            @keydown.enter="onEnter"
            @keydown.escape="showMenu = false"
        />

        <v-card
            v-if="showMenu && (suggestions.length > 0 || searched)"
            class="search-dropdown"
            elevation="8"
        >
            <v-list density="compact" v-if="suggestions.length">
                <v-list-item v-for="item in suggestions" :key="item.neid" @click="onSelect(item)">
                    <template #title>
                        <span>{{ item.name }}</span>
                        <v-chip v-if="item.flavor" size="x-small" class="ml-2" variant="tonal">
                            {{ item.flavor }}
                        </v-chip>
                    </template>
                    <template #subtitle>
                        <code class="text-caption">{{ item.neid }}</code>
                    </template>
                </v-list-item>
            </v-list>
            <div v-else-if="searched && !searching" class="pa-4 text-center text-medium-emphasis">
                No results
            </div>
        </v-card>
    </div>
</template>

<script setup lang="ts">
    interface SearchResult {
        neid: string;
        name: string;
        flavor: string | null;
        score: number | null;
    }

    withDefaults(
        defineProps<{
            label?: string;
            icon?: string;
        }>(),
        { label: 'Search entities', icon: 'mdi-magnify' }
    );

    const emit = defineEmits<{
        selected: [entity: { neid: string; name: string }];
    }>();

    const query = ref('');
    const suggestions = ref<SearchResult[]>([]);
    const searching = ref(false);
    const showMenu = ref(false);
    const searched = ref(false);
    let selectedName = '';
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    watch(query, (val) => {
        if (debounceTimer) clearTimeout(debounceTimer);
        if (val === selectedName) return;
        if (!val || val.trim().length < 2) {
            suggestions.value = [];
            showMenu.value = false;
            searched.value = false;
            return;
        }
        debounceTimer = setTimeout(() => doSearch(val.trim()), 250);
    });

    async function doSearch(q: string) {
        searching.value = true;
        try {
            const res = await $fetch<{ matches: SearchResult[] }>('/api/entity/search', {
                query: { q },
            });
            suggestions.value = res.matches ?? [];
            showMenu.value = true;
            searched.value = true;
        } catch {
            suggestions.value = [];
            showMenu.value = false;
        } finally {
            searching.value = false;
        }
    }

    function onSelect(item: SearchResult) {
        selectedName = item.name;
        query.value = item.name;
        suggestions.value = [];
        showMenu.value = false;
        searched.value = false;
        emit('selected', { neid: item.neid, name: item.name });
    }

    function onEnter() {
        if (suggestions.value.length > 0) {
            onSelect(suggestions.value[0]);
        }
    }

    function onClear() {
        selectedName = '';
        suggestions.value = [];
        showMenu.value = false;
        searched.value = false;
    }

    onMounted(() => {
        document.addEventListener('click', (e) => {
            const el = (e.target as HTMLElement)?.closest('.entity-search');
            if (!el) showMenu.value = false;
        });
    });
</script>

<style scoped>
    .entity-search {
        position: relative;
        width: 100%;
        max-width: 640px;
    }

    .search-dropdown {
        position: absolute;
        top: calc(100% + 4px);
        left: 0;
        right: 0;
        z-index: 100;
        max-height: 380px;
        overflow-y: auto;
    }
</style>
