<template>
  <form @submit.prevent="sign">
    <input
      v-model="email"
      type="email"
    >
    <input
      v-model="password"
      type="password"
    >
    <button type="submit">
      Sign In
    </button>
  </form>
</template>

<script setup lang="ts">
const supabase = useSupabaseClient()
const email = ref('')
const password = ref('')

const sign = async () => {
  const { error } = await supabase.auth.signInWithPassword({
    email: email.value,
    password: password.value
  })
  if (error) console.log(error)
}
</script>
