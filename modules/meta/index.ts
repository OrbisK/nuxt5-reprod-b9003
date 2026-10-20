// Like ../nuxt5-virtual-alias-repro, but the alias points to a directory:
// - alias `#meta` → `runtime/` (a *directory*)
// - Nitro virtual `#meta/nitro` (nested under that alias)
// - `runtime/nitro.ts` exists, so `#meta/nitro` alias-expands to a real file
import { addServerHandler, createResolver, defineNuxtModule } from '@nuxt/kit'

export default defineNuxtModule({
  meta: { name: 'meta' },
  setup(_, nuxt) {
    const resolver = createResolver(import.meta.url)

    nuxt.options.alias['#meta'] = resolver.resolve('./runtime')

    nuxt.hook('nitro:config', (nitroConfig) => {
      nitroConfig.virtual ||= {}
      nitroConfig.virtual['#meta/nitro'] = `export default { from: 'virtual' }`
    })

    addServerHandler({ route: '/api/meta', handler: resolver.resolve('./runtime/handler') })
  },
})
