<script setup lang="ts">
const supabase = useSupabaseClient()
const email = ref('')

async function signInWithOtp() {
  await supabase.auth.signInWithOtp({
    email: email.value
  })
}
</script>

<template>
  <input type="email" v-model="email" @keyup.enter="signInWithOtp()" placeholder="Login with email" />
</template>
