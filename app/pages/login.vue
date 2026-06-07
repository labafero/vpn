<script setup lang="ts">
import * as v from "valibot";
import type { FormSubmitEvent } from "@nuxt/ui";

definePageMeta({ layout: "auth" });

const schema = v.object({
  email: v.pipe(v.string(), v.email("Invalid email")),
  password: v.pipe(v.string(), v.minLength(8, "Must be at least 8 characters")),
});

type Schema = v.InferOutput<typeof schema>;

const state = reactive({
  email: "",
  password: "",
});

const toast = useToast();
const supabase = useSupabaseClient();

async function onSubmit(event: FormSubmitEvent<Schema>) {
  const { error } = await supabase.auth.signInWithPassword({
    email: event.data.email,
    password: event.data.password,
  });

  if (error) {
    console.log(error?.message);
    toast.add({ title: error.message, color: "error" });
    return;
  }

  navigateTo("/redacao");
}
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-4 p-4">
    <UPageCard class="w-full max-w-md" title="VPN" description="Faça login para continuar">
      <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
        <UFormField label="E-mail" name="email">
          <UInput v-model="state.email" class="w-full" />
        </UFormField>

        <UFormField label="Senha" name="password">
          <UInput v-model="state.password" type="password" class="w-full" />
        </UFormField>

        <UButton type="submit"> Entrar </UButton>
      </UForm>
    </UPageCard>
  </div>
</template>
