<script setup lang="ts">
import { CORES_DISPONIVEIS, corClasses, type CorBrand } from "~/utils/cidadeColors";

definePageMeta({ middleware: "auth" });

const route = useRoute();
const slug = route.params.slug as string;

const { config, fetchBySlug, save } = useCidadeConfig();
const { config: characterConfig, fetch: characterFetch, save: characterSave } = useCharacterConfig();
const toast = useToast();

const saving = ref(false);
const savingCharacter = ref(false);

const form = reactive({
  cidade_nome: "",
  jornal_nome: "",
  jornal_sigla: "",
  cor_primaria: "red" as CorBrand,
  logo_url: "",
});

const characterForm = reactive({
  character_name: "",
  passport_id: "",
  phone: "",
});

onMounted(async () => {
  await Promise.all([
    fetchBySlug(slug),
    characterFetch(slug),
  ]);

  if (config.value) {
    Object.assign(form, {
      cidade_nome: config.value.cidade_nome,
      jornal_nome: config.value.jornal_nome,
      jornal_sigla: config.value.jornal_sigla,
      cor_primaria: config.value.cor_primaria as CorBrand,
      logo_url: config.value.logo_url ?? "",
    });
  }

  Object.assign(characterForm, {
    character_name: characterConfig.value?.character_name ?? "",
    passport_id: characterConfig.value?.passport_id ?? "",
    phone: characterConfig.value?.phone ?? "",
  });
});

const previewCor = computed(() => corClasses[form.cor_primaria] ?? corClasses.red);

async function handleSave() {
  if (!form.cidade_nome || !form.jornal_nome || !form.jornal_sigla) {
    toast.add({ title: "Preencha todos os campos obrigatórios", color: "error" });
    return;
  }
  saving.value = true;
  try {
    await save({
      slug,
      cidade_nome: form.cidade_nome,
      jornal_nome: form.jornal_nome,
      jornal_sigla: form.jornal_sigla,
      cor_primaria: form.cor_primaria,
      logo_url: form.logo_url || null,
    });
    toast.add({ title: "Cidade salva", color: "success" });
  } catch {
    toast.add({ title: "Erro ao salvar", color: "error" });
  } finally {
    saving.value = false;
  }
}

async function handleSaveCharacter() {
  savingCharacter.value = true;
  try {
    await characterSave({
      cidade: slug,
      character_name: characterForm.character_name,
      passport_id: characterForm.passport_id,
      phone: characterForm.phone,
    });
    toast.add({ title: "Personagem salvo", color: "success" });
  } catch {
    toast.add({ title: "Erro ao salvar personagem", color: "error" });
  } finally {
    savingCharacter.value = false;
  }
}

const tabs = [
  { label: "Informações", slot: "informacoes" },
  { label: "Personagem", slot: "personagem" },
];
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="config?.cidade_nome ?? slug">
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
      <div class="p-4 max-w-2xl">
        <UTabs :items="tabs">
          <template #informacoes>
            <div class="space-y-4 pt-4">
              <UCard>
                <div class="space-y-4">
                  <UFormField label="Nome da Cidade" required>
                    <UInput v-model="form.cidade_nome" placeholder="Ex: Neon" class="w-full" />
                  </UFormField>

                  <UFormField label="Slug (URL)">
                    <UInput :model-value="slug" readonly class="w-full" />
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
                    Salvar
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

          <template #personagem>
            <div class="pt-4">
              <UCard>
                <div class="space-y-4">
                  <UFormField label="Nome do Personagem">
                    <UInput
                      v-model="characterForm.character_name"
                      placeholder="Ex: Jacky Tequila"
                      class="w-full"
                    />
                  </UFormField>

                  <UFormField label="Passaporte / ID">
                    <UInput
                      v-model="characterForm.passport_id"
                      placeholder="Ex: 1642"
                      class="w-full"
                    />
                  </UFormField>

                  <UFormField label="Telefone">
                    <UInput
                      v-model="characterForm.phone"
                      placeholder="Ex: 442-663"
                      class="w-full"
                    />
                  </UFormField>
                </div>

                <template #footer>
                  <UButton :loading="savingCharacter" class="w-full" @click="handleSaveCharacter">
                    Salvar Personagem
                  </UButton>
                </template>
              </UCard>
            </div>
          </template>
        </UTabs>
      </div>
    </template>
  </UDashboardPanel>
</template>
