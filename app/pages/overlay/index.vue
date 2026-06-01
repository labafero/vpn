<template>
  <div class="flex flex-col h-67.5">
    <!-- topbar -->
    <div class="flex border-t border-amber-600 py-2">
      <div class="border-l border-amber-600 py-1 pl-8 font-serif">
        <span class="text-amber-600">VPN</span>
        NEWS
      </div>
      <OverlayTinker />
      <div class="flex gap-4 items-center">
        <div>{{ Date.now().toLocaleString() }}</div>
        <div>
          <UBadge color="error" />
          AO VIVO
        </div>
      </div>
    </div>

    <!-- content -->
    <div class="flex border-t border-slate-800 h-full">
      <!-- box left -->
      <div class="h-full flex flex-col justify-between">
        <div>
          <div class="uppercase text-amber-600">Edição</div>
          <div class="opacity-70">Análise, gameplay e interação com a comunidade.</div>
        </div>
        <div>
          <div class="uppercase text-amber-600">Duração</div>
          <div class="font-serif text-2xl">02:42:49</div>
        </div>
      </div>

      <!-- box center -->
      <div></div>

      <!-- box right -->
      <div class="h-full flex flex-col justify-between">
        <div>
          <div class="uppercase text-amber-600">Audiência</div>
          <div class="opacity-70">A comunidade participa ao vivo</div>
        </div>
        <div>
          <div class="uppercase text-amber-600">Ranking de Matérias</div>
          <div class="flex items-center gap-2">
            <div>1</div>
            <div>Crime</div>
            <div>Crime</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>

</script>

<style></style>