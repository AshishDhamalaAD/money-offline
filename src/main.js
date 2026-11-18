import { createApp } from 'vue'
import { createPinia } from 'pinia'

import router from '@/router'
import App from '@/App.vue'
import '@/assets/styles/base.css'
import '@/assets/styles/utilities.css'
import { purgeExpiredTrash } from '@/services/trash'
import { hydrateLocalAttachments } from '@/utils/attachmentUrl'

const app = createApp(App)

app.use(createPinia())
app.use(router)

// Photos taken offline are stored as blobs and referenced as `local:` paths.
// Restoring the object URLs before the first render avoids a flash of empty
// thumbnails.
Promise.all([hydrateLocalAttachments(), purgeExpiredTrash()]).catch(console.error).finally(() => {
    app.mount('#app')
})
