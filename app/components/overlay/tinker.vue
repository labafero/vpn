<template>
  <div class="flex items-center border-t py-2 px-5" :class="cor.border">
    <UBadge class="animate-pulse" color="error" />
    <OverlayTinkerNews :cor-key="corKey" />
    <div class="border-l py-1 pl-4 whitespace-nowrap" :class="cor.border">
      <span :class="cor.text" class="font-bold">{{ sigla }}</span>
      <small><i> {{ nome }}</i></small>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { corClasses, DEFAULT_COR, DEFAULT_SIGLA, DEFAULT_NOME, type CorPrimaria } from "~/utils/cidadeColors";
import type { Tables } from "~/types/database.types";

const props = defineProps<{
  cityConfig?: Tables<"city_config"> | null;
}>();

const corKey = computed<CorPrimaria>(
  () => (props.cityConfig?.cor_primaria as CorPrimaria) ?? DEFAULT_COR,
);
const cor = computed(() => corClasses[corKey.value]);
const sigla = computed(() => props.cityConfig?.jornal_sigla ?? DEFAULT_SIGLA);
const nome = computed(() => props.cityConfig?.jornal_nome ?? DEFAULT_NOME);
</script>
