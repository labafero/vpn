export default defineAppConfig({
  ui: {
    button: {
      slots: {
        base: 'min-h-11 max-w-full sm:min-h-0',
        label: 'whitespace-normal wrap-anywhere text-start'
      }
    },
    input: { slots: { base: 'text-base sm:text-sm' } }
  }
})
