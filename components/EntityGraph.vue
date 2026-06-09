<template>
    <div class="entity-graph">
        <svg
            v-if="focus"
            ref="svgEl"
            class="graph-svg"
            :viewBox="`0 0 ${width} ${height}`"
            preserveAspectRatio="xMidYMid meet"
        >
            <defs>
                <marker
                    id="edge-arrow-out"
                    viewBox="0 0 10 10"
                    refX="9"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                >
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(255,255,255,0.45)" />
                </marker>
                <marker
                    id="edge-arrow-in"
                    viewBox="0 0 10 10"
                    refX="1"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto"
                >
                    <path d="M 10 0 L 0 5 L 10 10 z" fill="rgba(255,255,255,0.45)" />
                </marker>
            </defs>

            <g class="edges">
                <line
                    v-for="(node, i) in nodes"
                    :key="`edge-${node.neid}`"
                    :x1="cx"
                    :y1="cy"
                    :x2="node.x"
                    :y2="node.y"
                    :class="['edge', `edge-${node.direction}`]"
                    :marker-end="
                        node.direction === 'outgoing' || node.direction === 'both'
                            ? 'url(#edge-arrow-out)'
                            : ''
                    "
                    :marker-start="node.direction === 'incoming' ? 'url(#edge-arrow-in)' : ''"
                />
            </g>

            <g class="nodes">
                <g
                    v-for="node in nodes"
                    :key="node.neid"
                    :transform="`translate(${node.x}, ${node.y})`"
                    class="node neighbor-node"
                    @click="$emit('focus-node', node)"
                >
                    <circle r="8" class="node-dot" />
                    <text
                        :x="node.labelDx"
                        :y="node.labelDy"
                        :text-anchor="node.labelAnchor"
                        class="node-label"
                    >
                        {{ truncate(node.name) }}
                    </text>
                </g>

                <g class="node focus-node" :transform="`translate(${cx}, ${cy})`">
                    <circle r="36" class="focus-halo" />
                    <circle r="22" class="focus-dot" @click="$emit('focus-click')" />
                    <text class="focus-label" text-anchor="middle" :y="-46">
                        {{ truncate(focus.name, 56) }}
                    </text>
                    <text class="focus-hint" text-anchor="middle" :y="56">
                        click to view properties
                    </text>
                </g>
            </g>
        </svg>

        <div v-else class="graph-empty">
            <v-icon size="48" color="grey-darken-1">mdi-graph-outline</v-icon>
            <p class="text-medium-emphasis mt-2">Search for an entity to begin</p>
        </div>

        <div v-if="focus && nodes.length === 0" class="graph-noneighbors">
            <v-chip variant="tonal" color="grey" size="small">No one-hop neighbors found</v-chip>
        </div>
    </div>
</template>

<script setup lang="ts">
    interface Neighbor {
        neid: string;
        name: string;
        direction: 'incoming' | 'outgoing' | 'both';
    }

    interface Focus {
        neid: string;
        name: string;
    }

    const props = defineProps<{
        focus: Focus | null;
        neighbors: Neighbor[];
    }>();

    defineEmits<{
        (e: 'focus-node', node: Neighbor): void;
        (e: 'focus-click'): void;
    }>();

    const width = 900;
    const height = 600;
    const cx = width / 2;
    const cy = height / 2;
    const radius = 240;

    interface PositionedNode extends Neighbor {
        x: number;
        y: number;
        labelDx: number;
        labelDy: number;
        labelAnchor: 'start' | 'middle' | 'end';
    }

    const nodes = computed<PositionedNode[]>(() => {
        const list = props.neighbors;
        const n = list.length;
        if (n === 0) return [];
        return list.map((nb, i) => {
            const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
            const x = cx + Math.cos(angle) * radius;
            const y = cy + Math.sin(angle) * radius;
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            const labelDx = cos * 14;
            const labelDy = sin * 14 + 4;
            let labelAnchor: 'start' | 'middle' | 'end' = 'middle';
            if (cos > 0.2) labelAnchor = 'start';
            else if (cos < -0.2) labelAnchor = 'end';
            return { ...nb, x, y, labelDx, labelDy, labelAnchor };
        });
    });

    function truncate(s: string, n: number = 28): string {
        if (!s) return '';
        return s.length > n ? s.slice(0, n - 1) + '…' : s;
    }
</script>

<style scoped>
    .entity-graph {
        position: relative;
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
    }

    .graph-svg {
        width: 100%;
        height: 100%;
        max-width: 100%;
        max-height: 100%;
    }

    .graph-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        color: var(--lv-silver, #9aa0a6);
    }

    .graph-noneighbors {
        position: absolute;
        bottom: 16px;
        left: 50%;
        transform: translateX(-50%);
    }

    .edge {
        stroke: rgba(255, 255, 255, 0.18);
        stroke-width: 1.2;
        transition: stroke 0.2s;
    }

    .edge-incoming {
        stroke-dasharray: 4 3;
    }

    .neighbor-node {
        cursor: pointer;
    }

    .neighbor-node:hover .node-dot {
        fill: var(--lv-green, #5fd28a);
        stroke: var(--lv-green, #5fd28a);
        r: 10;
    }

    .neighbor-node:hover .node-label {
        fill: #fff;
    }

    .node-dot {
        fill: rgba(255, 255, 255, 0.06);
        stroke: rgba(255, 255, 255, 0.45);
        stroke-width: 1.5;
        transition: all 0.18s;
    }

    .node-label {
        font-size: 12px;
        fill: rgba(255, 255, 255, 0.7);
        font-family: var(--font-body, sans-serif);
        pointer-events: none;
        user-select: none;
    }

    .focus-node {
        cursor: pointer;
    }

    .focus-halo {
        fill: rgba(95, 210, 138, 0.08);
        stroke: rgba(95, 210, 138, 0.25);
        stroke-width: 1;
    }

    .focus-dot {
        fill: var(--lv-green, #5fd28a);
        stroke: rgba(255, 255, 255, 0.8);
        stroke-width: 2;
        transition: filter 0.18s;
    }

    .focus-node:hover .focus-dot {
        filter: brightness(1.15);
    }

    .focus-label {
        font-family: var(--font-headline, sans-serif);
        font-size: 18px;
        fill: #fff;
        font-weight: 500;
        pointer-events: none;
        user-select: none;
    }

    .focus-hint {
        font-size: 11px;
        fill: rgba(255, 255, 255, 0.5);
        pointer-events: none;
        user-select: none;
    }
</style>
