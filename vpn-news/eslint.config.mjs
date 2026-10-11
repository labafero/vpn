import withNuxt from './.nuxt/eslint.config.mjs'
import prettier from 'eslint-config-prettier/flat'

export default withNuxt({ rules: { 'vue/no-multiple-template-root': 'off' } }, prettier)
