---
trigger: always_on
---

# 🧱 **1. Project Structure (Mandatory)**

Use the following folder structure for all Vue 3 projects:

```
src/
│
├── assets/
│   ├── images/
│   ├── icons/
│   └── styles/
│       ├── base.css
│       ├── components.css
│       └── utilities.css
│
├── components/
│   ├── common/             // Reusable components
│   └── layout/             // Navbar, Sidebar
│
├── composables/            // useXYZ() hooks (fetch, form, sync)
│
├── router/
│   ├── index.js
│   └── guards.js
│
├── store/
│   ├── booktore.js
│   └── categoryStore.js
│
├── db/
│   ├── dexie.js            // Dexie instance
│   ├── repositories/       // CRUD wrappers
│   └── sync/               // sync engine
│
├── pages/                  // Vue views (lazy-loaded)
│
├── services/               // API calls (axios)
│
├── utils/                  // helper functions
│
├── constants/              // routes, enums, config
│
├── App.vue
└── main.js
```

---

# 🎨 **2. Tailwind CSS Rules**

### ✔ Principles

- Use Tailwind utilities for **all UI**.
- Avoid custom CSS except for global resets.
- Use `<style scoped>` only when necessary.

### ✔ Structure

Global CSS goes in:

```
src/assets/styles/base.css
src/assets/styles/components.css
src/assets/styles/utilities.css
```

### ✔ Reusable Example

```
.btn-primary {
  @apply px-4 py-2 bg-blue-600 text-white rounded-lg;
}
```

---

## @ in file import represents the root src directory

# 🧩 **3. Component Rules**

### ✔ Naming Convention

- Reusable components → `BaseButton.vue`, `BaseModal.vue`
- Layout components → `AppNavbar.vue`

### ✔ Component Template Structure

```
<script setup>
import { ref } from "vue";
</script>

<template>
  <div class="p-4 rounded-lg bg-white shadow">
    ...
  </div>
</template>

<style scoped>
/* only if needed */
</style>
```

### ✔ Component Rules

- Max 250 lines
- No API calls inside components
- No Vuex logic inside components
- Use composables for all logic

---

# 🔧 **4. Composables (`/composables`)**

Composables are the home for:
✔ data fetching
✔ form logic
✔ pagination
✔ sync logic
✔ common interactive logic

### ✔ Naming

```
useUsers.js
useTasks.js
usePagination.js
useForm.js
useOfflineSync.js
```

### ✔ Composable Template

```
import { ref } from "vue";
import { userService } from "@/services/userService";

export function useUsers() {
  const users = ref([]);
  const loading = ref(false);

  async function loadUsers() {
    loading.value = true;
    users.value = await userService.list();
    loading.value = false;
  }

  return { users, loading, loadUsers };
}
```

### ❌ Never put:

- UI logic
- DOM logic
- Vuex mutations
  inside composables

---

# 🏬 **5. Vuex (Composition API) Rules**

Vuex must use the **composition API helpers** (`useStore()`), not Options API.

### ✔ Store Structure

```
store/
│
├── modules/
│   └── userStore.js
└── helpers.js
```

### ✔ Store Module Example (JavaScript)

```
export const useBookStore = defineStore('book', () => {
    const books = ref([])

    return {
        books,
    }
})
```

---

# 🗄️ **6. IndexedDB (Dexie.js) Rules**

### ✔ Dexie Instance

```
import Dexie from "dexie";

export const db = new Dexie("app_db");

db.version(1).stores({
  users: "++id,name,email",
  tasks: "++id,title,status",
});
```

### ✔ Repository Layer

```
import { db } from "@/db/dexie";

export const usersRepo = {
  getAll: () => db.users.toArray(),
  save: (item) => db.users.put(item),
  delete: (id) => db.users.delete(id),
};
```

### ✔ Do NOT

- put Dexie calls inside components
- write sync logic inside Vuex

Dexie is **DB only**, nothing else.

---

# 🔁 **7. Offline Sync Rules**

Use a 3-layer sync architecture:

```
[1] Service → API calls
[2] Repository → IndexedDB
[3] Sync Engine → Logic to merge local+server
```

### ✔ Example Sync File

```
export async function syncUsers() {
  const localUsers = await usersRepo.getAll();
  const serverUsers = await userService.list();

  // merge logic here
}
```

### ✔ Sync must run on:

- app startup
- network reconnect
- manual sync button
- background worker (optional/PWA)

---

# 🧭 **8. Vue Router Rules**

### ✔ Structure

```
router/
│── index.js
└── guards.js
```

### ✔ Route Definition

```
{
  path: "/users",
  component: () => import("@/pages/users/index.vue"),
  meta: { auth: true }
}
```

### ✔ Use Guards for:

- auth check
- offline check
- unsaved form warning

---

# 🔌 **9. Service Layer (API)**

### ✔ Axios instance

```
import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 10000,
});
```

### ✔ Service Example

```
export const userService = {
  list: () => api.get("/users").then(r => r.data),
  create: (data) => api.post("/users", data).then(r => r.data),
};
```

### ❌ Never call axios directly in components

Always use services.

---

# 🛠️ **10. Utilities (`/utils`)**

### ✔ Must contain:

- debounce
- throttle
- formatters
- validators
- sorting helpers

### ✔ Example

```
export function debounce(fn, delay = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}
```

---

# 🔤 **11. Naming Conventions**

### ✔ Files

```
kebab-case
```

### ✔ Components

```
PascalCase: UserList.vue
```

### ✔ Functions & Variables

```
camelCase
```

### ✔ Constants

```
UPPER_SNAKE_CASE
```

### ✔ Directories

```
lowercase
```

---

# 🚦 **12. Error Handling Rules**

- Global error boundary page
- Toast notifications for API failures
- Track sync errors separately
- Handle Dexie errors gracefully

---

# ⚡ **13. Performance Rules**

- Use `<script setup>` always
- Use `v-memo` for expensive sections
- Avoid watchers → prefer computed
- Lazy-load all pages
- Avoid unnecessary reactivity
- Use `ref()` for small state
- Avoid large arrays in Vuex

---

# 🤖 **14. Code Generation Rules (For AI)**

When generating code:

1. Follow this exact folder structure
2. Always use `<script setup>`
3. Use Composition API (no Options API)
4. No TypeScript
5. No API/Dexie logic inside components
6. Put logic in composables
7. Put persistence in repositories
8. Put API calls in services
9. Put routing in `/router`
10. Generate clean Tailwind classes only
11. No unnecessary libraries
12. Code must be readable & modular
13. Page related components must remain in the specific page directory

---
