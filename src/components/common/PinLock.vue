<script setup>
import { ref, watch } from "vue"
import { useSettingsStore } from "@/store/settingsStore"
import IconLock from "@/assets/icons/IconLock.vue"
import IconX from "@/assets/icons/IconX.vue"

const props = defineProps({
  mode: {
    type: String, // 'unlock' | 'setup' | 'verify'
    default: "unlock",
  },
  title: {
    type: String,
    default: "",
  },
  description: {
    type: String,
    default: "",
  },
})

const emit = defineEmits(["unlocked", "setup-complete", "cancel", "verified"])
const settingsStore = useSettingsStore()

const pin = ref("")
const error = ref(null)
const confirmMode = ref(false)
const firstPin = ref("")
const isUnlocking = ref(false)

const keypad = [1, 2, 3, 4, 5, 6, 7, 8, 9, "", 0, "backspace"]

function handleKey(key) {
  if (key === "" || isUnlocking.value) return
  if (key === "backspace") {
    pin.value = pin.value.slice(0, -1)
    return
  }

  if (pin.value.length < 6) {
    pin.value += key
  }
}

watch(pin, async (newPin) => {
  if (newPin.length === 6) {
    if (props.mode === "unlock" || props.mode === "verify") {
      const isValid = await settingsStore.verifyPinCode(newPin)
      if (isValid) {
        isUnlocking.value = true
        setTimeout(() => {
          if (props.mode === "verify") {
            emit("verified")
          } else {
            emit("unlocked")
          }
        }, 400)
      } else {
        error.value = "Incorrect PIN"
        setTimeout(() => {
          pin.value = ""
          error.value = null
        }, 1000)
      }
    } else if (props.mode === "setup") {
      if (!confirmMode.value) {
        firstPin.value = newPin
        confirmMode.value = true
        pin.value = ""
      } else {
        if (newPin === firstPin.value) {
          const result = await settingsStore.savePinCode(newPin)
          if (result.success) {
            isUnlocking.value = true
            setTimeout(() => {
              emit("setup-complete")
            }, 400)
          } else {
            error.value = result.message
          }
        } else {
          error.value = "PINs do not match"
          setTimeout(() => {
            pin.value = ""
            error.value = null
            confirmMode.value = false
            firstPin.value = ""
          }, 1000)
        }
      }
    }
  }
})

function onCancel() {
  emit("cancel")
}
</script>

<template>
  <div
    :class="[
      'fixed inset-0 z-60 flex flex-col items-center justify-center transition-all duration-500',
      isUnlocking ? 'opacity-0 scale-110 pointer-events-none' : 'opacity-100 scale-100',
      'bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white',
    ]"
  >
    <div v-if="mode !== 'unlock'" class="absolute top-4 right-4">
      <button @click="onCancel" class="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors">
        <IconX class="w-6 h-6 text-gray-500 dark:text-gray-400" />
      </button>
    </div>

    <div class="flex flex-col items-center space-y-8 p-6 max-w-sm w-full text-center">
      <div class="p-4 bg-gray-100 dark:bg-gray-800 rounded-full transition-colors">
        <IconLock class="w-12 h-12 text-indigo-600 dark:text-indigo-400" />
      </div>

      <div class="space-y-2">
        <h1 class="text-2xl font-bold">
          {{ title || (mode === "setup" ? (confirmMode ? "Confirm PIN" : "Setup PIN") : "Enter PIN") }}
        </h1>
        <p class="text-gray-500 dark:text-gray-400">
          {{
            description ||
            (mode === "setup" ? "Create a 6-digit PIN for security" : "Enter your 6-digit PIN to continue")
          }}
        </p>
      </div>

      <!-- PIN Display -->
      <div class="flex justify-center gap-3">
        <div
          v-for="i in 6"
          :key="i"
          :class="[
            'w-4 h-4 rounded-full border-2 transition-all duration-200',
            pin.length >= i
              ? 'bg-indigo-600 border-indigo-600 dark:bg-white dark:border-white scale-110'
              : 'border-gray-300 dark:border-gray-600',
          ]"
        />
      </div>

      <div v-if="error" class="text-red-600 dark:text-red-400 text-sm h-5 font-medium">
        {{ error }}
      </div>
      <div v-else class="h-5"></div>

      <!-- Keypad -->
      <div class="grid grid-cols-3 gap-6 w-full max-w-[280px]">
        <button
          v-for="key in keypad"
          :key="key"
          @click="handleKey(key)"
          :class="[
            'flex items-center justify-center h-16 w-16 text-2xl font-medium rounded-full transition-all active:scale-95',
            key === ''
              ? 'invisible'
              : 'bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600 shadow-sm dark:shadow-none',
          ]"
        >
          <template v-if="key === 'backspace'">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              class="w-8 h-8 text-gray-400 dark:text-gray-500"
            >
              <path
                d="M7 6L2.33333 12L7 18H20C21.1046 18 22 17.1046 22 16V8C22 6.89543 21.1046 6 20 6H7ZM18 15.4142L16.5858 16.8284L14 14.2426L11.4142 16.8284L10 15.4142L12.5858 12.8284L10 10.2426L11.4142 8.82843L14 11.4142L16.5858 8.82843L18 10.2426L15.4142 12.8284L18 15.4142Z"
              ></path>
            </svg>
          </template>
          <template v-else>{{ key }}</template>
        </button>
      </div>
    </div>
  </div>
</template>
