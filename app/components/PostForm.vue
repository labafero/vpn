<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    initialTitle?: string;
    initialBody?: string;
    initialCoverUrl?: string;
    submitLabel?: string;
  }>(),
  {
    initialTitle: "",
    initialBody: "",
    initialCoverUrl: "",
    submitLabel: "Publicar",
  },
);

const emit = defineEmits<{
  submit: [data: { title: string; body: string; cover_url: string }];
}>();

const title = ref(props.initialTitle);
const body = ref(props.initialBody);
const coverUrl = ref(props.initialCoverUrl);
const error = ref("");
const submitting = ref(false);

async function handleSubmit() {
  error.value = "";

  if (!title.value.trim()) {
    error.value = "Título é obrigatório";
    return;
  }

  submitting.value = true;
  emit("submit", {
    title: title.value.trim(),
    body: body.value,
    cover_url: coverUrl.value,
  });
}

function setSubmitting(v: boolean) {
  submitting.value = v;
}

defineExpose({ setSubmitting });
</script>

<template>
  <form class="space-y-4 max-w-2xl" @submit.prevent="handleSubmit">
    <p v-if="error" class="text-red-500 text-sm">
      {{ error }}
    </p>

    <div>
      <label class="block text-sm font-medium mb-1" for="title">Título</label>
      <input
        id="title"
        v-model="title"
        type="text"
        required
        class="w-full border rounded px-3 py-2"
      />
    </div>

    <div>
      <label class="block text-sm font-medium mb-1" for="body">Conteúdo</label>
      <textarea
        id="body"
        v-model="body"
        rows="10"
        class="w-full border rounded px-3 py-2 font-mono"
      />
    </div>

    <div>
      <label class="block text-sm font-medium mb-1" for="cover_url"
        >URL da imagem de capa</label
      >
      <input
        id="cover_url"
        v-model="coverUrl"
        type="url"
        placeholder="https://"
        class="w-full border rounded px-3 py-2"
      />
    </div>

    <div class="flex gap-2">
      <UButton type="submit" :loading="submitting">
        {{ submitLabel }}
      </UButton>
      <UButton color="neutral" to="/redacao"> Cancelar </UButton>
    </div>
  </form>
</template>
