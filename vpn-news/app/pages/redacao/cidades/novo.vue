<script setup lang="ts">
import { CORES_DISPONIVEIS, corClasses, type CorBrand } from "~/utils/cidadeColors";

definePageMeta({ middleware: "auth" });

const { save, setActiveSeason } = useCidadeConfig();
const toast = useToast();

const saving = ref(false);

const form = reactive({
  cidade_nome: "",
  season: "",
  slug: "",
  jornal_nome: "",
  jornal_sigla: "",
  cor_primaria: "red" as CorBrand,
  logo_url: "",
});

watch(
  () => form.cidade_nome,
  (val) => {
    form.slug = val.toLowerCase().trim().replace(/\s+/g, "-");
  },
);

const previewCor = computed(() => corClasses[form.cor_primaria] ?? corClasses.red);

async function handleSave() {
  if (!form.slug || !form.cidade_nome || !form.jornal_nome || !form.jornal_sigla) {
    toast.add({ title: "Preencha todos os campos obrigatórios", color: "error" });
    return;
  }
  saving.value = true;
  try {
    await save({
      slug: form.slug,
      cidade_nome: form.cidade_nome,
      jornal_nome: form.jornal_nome,
      jornal_sigla: form.jornal_sigla,
      cor_primaria: form.cor_primaria,
      logo_url: form.logo_url || null,
    });
    await setActiveSeason(form.slug, form.season);
    toast.add({ title: "Cidade criada", color: "success" });
    await navigateTo(`/redacao/cidades/${form.slug}`);
  } catch {
    toast.add({ title: "Erro ao criar cidade", color: "error" });
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Nova Cidade">
        <template #left>
          <UButton
            variant="ghost"
            icon="i-lucide-arrow-left"
            to="/redacao/cidades"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-4 max-w-2xl space-y-4">
        <UCard>
          <div class="space-y-4">
            <UFormField label="Nome da Cidade" required>
              <UInput v-model="form.cidade_nome" placeholder="Ex: Neon" class="w-full" />
            </UFormField>

            <UFormField label="Season atual (opcional)">
              <UInput
                v-model="form.season"
                maxlength="50"
                placeholder="Ex: Season 1 ou Alpha 2"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Slug (URL)" required>
              <UInput v-model="form.slug" placeholder="Ex: neon" class="w-full" />
            </UFormField>

            <UFormField label="Nome do Jornal" required>
              <UInput v-model="form.jornal_nome" placeholder="Ex: Neon TV" class="w-full" />
            </UFormField>

            <UFormField label="Sigla" required>
              <UInput v-model="form.jornal_sigla" placeholder="Ex: NTV" class="w-full max-w-32" />
            </UFormField>

            <UFormField label="Cor Principal">
              <div class="flex flex-wrap gap-2 mt-1">
                <button
                  v-for="cor in CORES_DISPONIVEIS"
                  :key="cor"
                  type="button"
                  class="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110"
                  :class="[
                    corClasses[cor].bg,
                    form.cor_primaria === cor ? 'border-white scale-110' : 'border-transparent',
                  ]"
                  :title="cor"
                  @click="form.cor_primaria = cor"
                />
              </div>
            </UFormField>

            <UFormField label="Logo URL (opcional)">
              <UInput v-model="form.logo_url" placeholder="https://..." class="w-full" />
            </UFormField>
          </div>

          <template #footer>
            <UButton :loading="saving" class="w-full" @click="handleSave">
              Criar Cidade
            </UButton>
          </template>
        </UCard>

        <UCard>
          <template #header>
            <span class="font-semibold text-sm text-muted">Preview do header</span>
          </template>
          <div class="rounded-lg overflow-hidden border" :class="previewCor.border">
            <div
              class="bg-zinc-950 px-4 h-12 flex items-center justify-between border-b"
              :class="previewCor.border"
            >
              <span class="font-bold text-sm tracking-tight text-white">
                <span :class="previewCor.text">{{ form.jornal_sigla || "TV" }}</span>
                {{ form.jornal_nome || "Roleplay" }}
              </span>
              <UIcon name="lucide:pen-line" class="w-4 h-4 text-zinc-500" />
            </div>
          </div>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
