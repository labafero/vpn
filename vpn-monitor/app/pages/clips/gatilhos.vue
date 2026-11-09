<script setup lang="ts">
definePageMeta({ middleware: 'auth', colorMode: 'dark' })

await navigateTo('/clips?tab=gatilhos', { redirectCode: 302, replace: true })
</script>
