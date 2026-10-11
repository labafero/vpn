<script setup lang="ts">
import { formatMarketAmount, historyChartPoints } from '~/utils/marketValues'

const props = defineProps<{ series: { at: string; cents: number }[] }>()
const points = computed(() => historyChartPoints(props.series).map(point => `${point.x},${point.y}`).join(' '))
</script>

<template>
  <div>
    <p v-if="!series.length" class="text-muted">Nenhum valor no período selecionado.</p>
    <svg v-else viewBox="0 0 600 200" role="img" aria-label="Evolução dos valores da série selecionada" class="w-full max-h-64 text-primary">
      <title>Evolução dos valores — dados disponíveis na tabela abaixo</title>
      <line x1="30" y1="180" x2="570" y2="180" stroke="currentColor" opacity="0.3" />
      <polyline :points="points" fill="none" stroke="currentColor" stroke-width="3" />
      <circle v-if="series.length === 1" cx="30" cy="170" r="4" fill="currentColor" />
      <text x="30" y="195" fill="currentColor" font-size="10">{{ new Date(series[0]!.at).toLocaleDateString('pt-BR') }}</text>
      <text x="570" y="195" text-anchor="end" fill="currentColor" font-size="10">{{ new Date(series[series.length - 1]!.at).toLocaleDateString('pt-BR') }}</text>
    </svg>
    <details v-if="series.length" class="mt-3">
      <summary class="cursor-pointer">Ver todos os dados do gráfico</summary>
      <table class="w-full text-sm"><caption class="sr-only">Histórico completo da série selecionada</caption><thead><tr><th>Data</th><th>Valor</th></tr></thead>
        <tbody><tr v-for="(point, index) in series" :key="index"><td>{{ new Date(point.at).toLocaleString('pt-BR') }}</td><td>{{ formatMarketAmount(point.cents / 100) }}</td></tr></tbody>
      </table>
    </details>
  </div>
</template>
