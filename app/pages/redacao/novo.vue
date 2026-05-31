<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const router = useRouter()

const postFormRef = ref<{ setSubmitting: (v: boolean) => void } | null>(null)

async function handleSubmit(data: { title: string, body: string, cover_url: string }) {
  const { error } = await supabase
    .from('posts')
    .insert({ ...data, user_id: user.value!.id })

  if (error) {
    postFormRef.value?.setSubmitting(false)
    return
  }

  router.push('/redacao')
}
</script>

<template>
  <div class="max-w-3xl mx-auto py-8 px-4">
    <h1 class="text-2xl font-bold mb-6">
      Novo Post
    </h1>
    <PostForm
      ref="postFormRef"
      @submit="handleSubmit"
    />
  </div>
</template>
