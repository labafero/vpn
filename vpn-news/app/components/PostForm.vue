<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    initialTitle?: string;
    initialBody?: string;
    initialCidade?: string;
    initialCoverUrl?: string;
    initialMediaUrl?: string;
    initialMediaType?: "audio" | "video" | null;
    initialDestaque?: boolean;
    initialPublishedAt?: string;
    submitLabel?: string;
  }>(),
  {
    initialTitle: "",
    initialBody: "",
    initialCidade: "",
    initialCoverUrl: "",
    initialMediaUrl: "",
    initialMediaType: null,
    initialDestaque: false,
    initialPublishedAt: "",
    submitLabel: "Publicar",
  },
);

const emit = defineEmits<{
  submit: [
    data: {
      title: string;
      body: string;
      cidade: string;
      coverFile: File | null;
      mediaFile: File | null;
      removeCover: boolean;
      removeMedia: boolean;
      destaque: boolean;
      publishedAt: string;
    },
  ];
}>();

function toDateInputValue(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const formState = ref<Record<string, unknown>>({});
const error = ref("");
const submitting = ref(false);

const title = ref(props.initialTitle);
const body = ref(props.initialBody);
const cidade = ref(props.initialCidade);
const destaque = ref(props.initialDestaque);
const publishedAt = ref(toDateInputValue(props.initialPublishedAt));

const coverFile = ref<File | null>(null);
const coverFileObj = ref<File | null>(null);
const coverPreview = ref(props.initialCoverUrl);
const removeCover = ref(false);

const mediaFile = ref<File | null>(null);
const mediaFileObj = ref<File | null>(null);
const mediaPreview = ref<string | null>(props.initialMediaUrl || null);
const mediaType = ref(props.initialMediaType);
const removeMedia = ref(false);

watch(coverFileObj, (file) => {
  if (file) {
    coverFile.value = file;
    removeCover.value = false;
    coverPreview.value = URL.createObjectURL(file);
  }
});

watch(mediaFileObj, (file) => {
  if (file) {
    mediaFile.value = file;
    removeMedia.value = false;
    mediaPreview.value = URL.createObjectURL(file);
    mediaType.value = file.type.startsWith("video/") ? "video" : "audio";
  }
});

function removeCoverHandler() {
  coverFile.value = null;
  coverFileObj.value = null;
  coverPreview.value = "";
  removeCover.value = true;
}

function removeMediaHandler() {
  mediaFile.value = null;
  mediaFileObj.value = null;
  mediaPreview.value = null;
  mediaType.value = null;
  removeMedia.value = true;
}

function handleSubmit() {
  error.value = "";
  if (!title.value.trim()) {
    error.value = "Título é obrigatório";
    return;
  }
  if (!cidade.value.trim()) {
    error.value = "Cidade é obrigatória";
    return;
  }
  submitting.value = true;
  emit("submit", {
    title: title.value.trim(),
    body: body.value,
    cidade: cidade.value,
    coverFile: coverFile.value,
    mediaFile: mediaFile.value,
    removeCover: removeCover.value,
    removeMedia: removeMedia.value,
    destaque: destaque.value,
    publishedAt: publishedAt.value,
  });
}

function setSubmitting(v: boolean) {
  submitting.value = v;
}

defineExpose({ setSubmitting });
</script>

<template>
  <UForm :state="formState" class="space-y-4 max-w-2xl" @submit="handleSubmit">
    <UAlert
      v-if="error"
      color="error"
      variant="soft"
      :title="error"
      icon="lucide:circle-x"
    />

    <UFormField label="Título" name="title" required>
      <UInput v-model="title" class="w-full" />
    </UFormField>

    <UFormField label="Cidade" name="cidade" required>
      <UInput v-model="cidade" class="w-full" placeholder="Ex: Los Santos" />
    </UFormField>

    <UFormField label="Conteúdo" name="body">
      <UTextarea v-model="body" :rows="10" class="w-full font-mono" />
    </UFormField>

    <UFormField label="Imagem de capa" name="cover">
      <div class="space-y-2 w-full">
        <div v-if="coverPreview && !removeCover" class="relative inline-block">
          <img
            :src="coverPreview"
            alt="Preview da capa"
            class="w-48 h-32 object-cover rounded"
          />
          <UButton
            color="error"
            variant="solid"
            size="xs"
            icon="lucide:x"
            class="absolute top-1 right-1"
            @click="removeCoverHandler"
          />
        </div>
        <UFileUpload
          v-model="coverFileObj"
          accept="image/*"
          variant="button"
          label="Selecionar imagem"
          :preview="false"
        />
      </div>
    </UFormField>

    <UFormField label="Destaque" name="destaque">
      <UCheckbox v-model="destaque" label="Marcar como destaque" />
    </UFormField>

    <UFormField label="Data de publicação" name="publishedAt">
      <UInput v-model="publishedAt" type="date" class="w-full" />
    </UFormField>

    <UFormField label="Mídia (áudio/vídeo)" name="media">
      <div class="space-y-2 w-full">
        <div v-if="mediaPreview && !removeMedia" class="relative">
          <audio
            v-if="mediaType === 'audio'"
            :src="mediaPreview"
            controls
            class="w-full"
          />
          <video
            v-else-if="mediaType === 'video'"
            :src="mediaPreview"
            controls
            class="w-full max-h-48 rounded"
          />
          <UButton
            color="error"
            variant="solid"
            size="xs"
            icon="lucide:x"
            class="absolute top-1 right-1"
            @click="removeMediaHandler"
          />
        </div>
        <UFileUpload
          v-model="mediaFileObj"
          accept="audio/*,video/*"
          variant="button"
          label="Selecionar arquivo"
          :preview="false"
        />
      </div>
    </UFormField>

    <div class="flex gap-2">
      <UButton type="submit" :loading="submitting">
        {{ submitLabel }}
      </UButton>
      <UButton color="neutral" to="/redacao"> Cancelar </UButton>
    </div>
  </UForm>
</template>
