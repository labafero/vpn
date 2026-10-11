<script setup lang="ts">
import { formatMarketAmount } from '~/utils/marketValues'

const { broadcasterId, cidadeSlug, cor } = useOverlayState()
const { stocks } = useOverlayStocks(broadcasterId, cidadeSlug)
const indicators = { up: '▲', down: '▼', stable: '—' } as const
</script>

<template>
  <UMarquee v-if="stocks.length" class="px-4 py-2" aria-label="Valores recentes de mercado">
    <span v-for="stock in stocks" :key="stock.item_id" class="flex items-center gap-2 whitespace-nowrap">
      <span :class="cor.text">{{ indicators[stock.trend as keyof typeof indicators] }}</span>
      <span v-if="!cidadeSlug" class="text-muted">{{ stock.cidade }}:</span>
      <span>{{ stock.item_name }} — {{ formatMarketAmount(stock.amount) }}</span>
    </span>
  </UMarquee>
</template>
