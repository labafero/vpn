export default defineAppConfig({
  ui: {
    dashboardNavbar: {
      slots: {
        root: 'h-auto min-h-(--ui-header-height) flex-wrap gap-y-2 py-3 sm:h-(--ui-header-height) sm:flex-nowrap sm:py-0',
        left: 'w-full min-w-0 sm:w-auto sm:flex-1',
        right: 'empty:hidden w-full flex-wrap sm:w-auto',
        title: 'min-w-0 whitespace-normal wrap-anywhere sm:truncate'
      }
    },
    dashboardPanel: { slots: { body: 'min-w-0' } },
    pagination: { slots: { list: 'flex-wrap justify-center' } }
  }
})
