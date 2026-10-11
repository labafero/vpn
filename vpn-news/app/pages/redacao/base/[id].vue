<script setup lang="ts">
import { TYPE_LABELS, TYPE_COLORS, TYPE_FIELDS, type DbRecordType, type DbRecordNote } from "~/composables/useDbRecords";

definePageMeta({ middleware: ["auth", "editorial"] });

const route = useRoute();
const { fetchOne, update, fetchNotes, addNote, deleteNote, updateNote } = useDbRecords();
const { all: cidades, fetchAll: fetchCidades } = useCidadeConfig();
const toast = useToast();
const currentUser = useSupabaseUser();
const noteId = ref<number | null>(null);
const noteText = ref('');
const loadError = ref('');

const record = ref<Awaited<ReturnType<typeof fetchOne>> | null>(null);
const notes = ref<DbRecordNote[]>([]);
const editing = ref(false);
const saving = ref(false);
const newNote = ref("");
const addingNote = ref(false);

const editNome = ref("");
const editCidade = ref<string | null>(null);
const editDados = ref<Record<string, string>>({});

onMounted(async () => {
  await Promise.all([fetchCidades(), loadRecord()]);
});

async function loadRecord() {
  const id = Number(route.params.id);
  if (!Number.isSafeInteger(id) || id < 1) { loadError.value = 'Registro não encontrado'; return }
  try {
  record.value = await fetchOne(id);
  notes.value = await fetchNotes(id);
  } catch { loadError.value = 'Registro não encontrado ou acesso indisponível' }
}

const cidadeOptions = computed(() => [
  { label: "Nenhuma", value: null },
  ...cidades.value.map((c) => ({ label: c.cidade_nome, value: c.slug }))
]);

const fields = computed(() => record.value ? TYPE_FIELDS[record.value.type as DbRecordType] : []);

function startEdit() {
  if (!record.value) return;
  editNome.value = record.value.nome;
  editCidade.value = record.value.cidade;
  editDados.value = { ...record.value.dados };
  editing.value = true;
}

function cancelEdit() {
  editing.value = false;
}

async function handleSave() {
  if (!record.value || !editNome.value.trim()) return;
  saving.value = true;
  try {
    record.value = await update(record.value.id, {
      nome: editNome.value.trim(),
      dados: editDados.value,
      cidade: editCidade.value
    });
    editing.value = false;
    toast.add({ title: "Registro atualizado", color: "success" });
  } catch {
    toast.add({ title: "Erro ao salvar", color: "error" });
  } finally {
    saving.value = false;
  }
}

async function handleAddNote() {
  if (!record.value || !newNote.value.trim()) return;
  addingNote.value = true;
  try {
    const note = await addNote(record.value.id, newNote.value.trim());
    notes.value.push(note);
    newNote.value = "";
  } catch {
    toast.add({ title: "Erro ao adicionar nota", color: "error" });
  } finally {
    addingNote.value = false;
  }
}

async function handleDeleteNote(noteId: number) {
  try {
    await deleteNote(noteId);
    notes.value = notes.value.filter((n) => n.id !== noteId);
  } catch {
    toast.add({ title: "Erro ao remover nota", color: "error" });
  }
}
async function saveNote() {
  if (!noteId.value || addingNote.value) return
  addingNote.value = true
  try {
    const updated = await updateNote(noteId.value, noteText.value)
    notes.value = notes.value.map(n => n.id === updated.id ? updated : n)
    noteId.value = null
  } catch { toast.add({ title: 'Não foi possível editar a nota', color: 'error' }) }
  finally { addingNote.value = false }
}
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="record?.nome ?? 'Carregando...'">
        <template #leading>
          <UButton variant="ghost" icon="i-lucide-arrow-left" to="/redacao/base" />
        </template>
        <template #right>
          <template v-if="editing">
            <UButton variant="ghost" @click="cancelEdit">Cancelar</UButton>
            <UButton :loading="saving" :disabled="saving" @click="handleSave">Salvar</UButton>
          </template>
          <UButton v-else variant="outline" icon="i-lucide-pencil" @click="startEdit">
            Editar
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <UAlert v-if="loadError" color="error" :description="loadError" class="m-4" /><div v-else-if="!record" class="p-4 space-y-2">
        <USkeleton v-for="i in 4" :key="i" class="h-12 rounded-lg" />
      </div>

      <div v-else class="p-4 space-y-4 max-w-xl">
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UBadge
                :label="TYPE_LABELS[record.type as DbRecordType]"
                :color="TYPE_COLORS[record.type as DbRecordType]"
                variant="subtle"
              />
              <span class="text-xs text-muted">
                atualizado em {{ new Date(record.updated_at).toLocaleString("pt-BR") }}
              </span>
            </div>
          </template>

          <div class="space-y-4">
            <UFormField label="Nome">
              <UInput v-if="editing" v-model="editNome" class="w-full" />
              <p v-else class="text-sm py-1">{{ record.nome }}</p>
            </UFormField>

            <UFormField label="Cidade">
              <USelect
                v-if="editing"
                v-model="editCidade"
                :items="cidadeOptions"
                value-key="value"
                label-key="label"
                class="w-full"
              />
              <p v-else class="text-sm py-1">{{ record.cidade ?? "—" }}</p>
            </UFormField>

            <USeparator />

            <UFormField
              v-for="field in fields"
              :key="field.key"
              :label="field.label"
            >
              <USelect
                v-if="editing && field.type === 'select'"
                v-model="editDados[field.key]"
                :items="field.options!.map((o) => ({ label: o, value: o }))"
                value-key="value"
                label-key="label"
                class="w-full"
              />
              <UInput
                v-else-if="editing"
                v-model="editDados[field.key]"
                :placeholder="field.label"
                class="w-full"
              />
              <p v-else class="text-sm py-1">{{ record.dados[field.key] ?? "—" }}</p>
            </UFormField>
          </div>
        </UCard>

        <BaseRecordRelations :key="record.id" :record-id="record.id" />
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-message-square" />
              <span class="font-semibold">Notas</span>
              <UBadge :label="String(notes.length)" variant="subtle" />
            </div>
          </template>

          <div class="space-y-3">
            <div v-if="notes.length === 0" class="text-muted text-sm py-2 text-center">
              Nenhuma nota ainda.
            </div>
            <div
              v-for="note in notes"
              :key="note.id"
              class="flex gap-2 items-start group"
            >
              <div v-if="noteId === note.id" class="flex-1 space-y-2"><UTextarea v-model="noteText" :maxlength="5000" class="w-full" /><UButton :loading="addingNote" @click="saveNote">Salvar nota</UButton><UButton variant="outline" @click="noteId = null">Cancelar</UButton></div><p v-else class="flex-1 text-sm whitespace-pre-wrap">{{ note.body }}</p><UButton v-if="note.created_by === currentUser?.sub" variant="ghost" icon="i-lucide-pencil" aria-label="Editar nota" @click="noteId = note.id; noteText = note.body" />
              <div class="flex items-center gap-1 shrink-0">
                <span class="text-xs text-muted hidden group-hover:block">
                  {{ new Date(note.created_at).toLocaleDateString("pt-BR") }}
                </span>
                <UButton
                  v-if="note.created_by === currentUser?.sub"
                  size="xs"
                  variant="ghost"
                  color="error"
                  icon="i-lucide-trash-2"
                  class="opacity-100"
                  aria-label="Remover nota"
                  @click="handleDeleteNote(note.id)"
                />
              </div>
            </div>
          </div>

          <template #footer>
            <div class="flex gap-2">
              <UTextarea
                v-model="newNote"
                placeholder="Adicionar nota..."
                :rows="2"
                class="flex-1"
              />
              <UButton
                :loading="addingNote"
                aria-label="Adicionar nota"
                :disabled="!newNote.trim()"
                icon="i-lucide-send"
                @click="handleAddNote"
              />
            </div>
          </template>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
