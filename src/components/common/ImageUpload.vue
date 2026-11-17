<script setup>
import { ref, onMounted, onUnmounted } from "vue"
import vueFilePond from "vue-filepond"
import "filepond/dist/filepond.min.css"
import "filepond-plugin-image-preview/dist/filepond-plugin-image-preview.min.css"
import FilePondPluginFileValidateType from "filepond-plugin-file-validate-type"
import FilePondPluginFileValidateSize from "filepond-plugin-file-validate-size"
import FilePondPluginImagePreview from "filepond-plugin-image-preview"

import { uploadService } from "@/services/uploadService"

const props = defineProps({
  from: {
    type: String,
    required: true,
    validator: (value) => {
      return ["products", "transactions"].includes(value)
    },
  },
})

const FilePond = vueFilePond(FilePondPluginFileValidateType, FilePondPluginFileValidateSize, FilePondPluginImagePreview)

const emit = defineEmits(["upload"])

const isOnline = ref(navigator.onLine)
const pond = ref(null)

// Native camera capture, kept separate from FilePond so a single tap opens the
// camera on a phone instead of the photo library.
const cameraInput = ref(null)
const isCapturing = ref(false)
const captureError = ref("")

function updateOnlineStatus() {
  isOnline.value = navigator.onLine
}

onMounted(() => {
  window.addEventListener("online", updateOnlineStatus)
  window.addEventListener("offline", updateOnlineStatus)
})

onUnmounted(() => {
  window.removeEventListener("online", updateOnlineStatus)
  window.removeEventListener("offline", updateOnlineStatus)
})

function openCamera() {
  captureError.value = ""
  cameraInput.value?.click()
}

async function handleCameraCapture(event) {
  const file = event.target.files?.[0]
  if (!file) return

  isCapturing.value = true
  try {
    const url = await uploadService.uploadImage(file, props.from)
    emit("upload", url)
  } catch (e) {
    console.error(e)
    captureError.value = e.message
  } finally {
    isCapturing.value = false
    // Reset so the same photo can be retaken
    event.target.value = ""
  }
}

const serverOptions = {
  process: async (fieldName, file, metadata, load, error, progress, abort, transfer, options) => {
    try {
      const url = await uploadService.uploadImage(file, props.from)
      load(url)
      emit("upload", url)

      // Clear the file from the pond after a short delay so user can add more
      // Or keep it? Usually better to keep it to show success, but we are showing images in LightGallery.
      // The requirement says: "As soon as image is added... send request... On the edit page, it must show me the uploaded images... In the edit page, if we upload new images from the filepond, then after upload, append the image urls to the attachments field."
      // If we keep it in FilePond, we have duplicates (one in FilePond, one in LightGallery).
      // So we should probably remove it from FilePond after success.
      setTimeout(() => {
        if (pond.value) {
          const filepondFile = pond.value.getFiles().find((f) => f.file.name === file.name && f.file.size === file.size)

          if (filepondFile) {
            pond.value.removeFile(filepondFile.id)
          }
        }
      }, 1000)

      return {
        abort: () => {
          // Abort logic if needed
          abort()
        },
      }
    } catch (e) {
      console.error(e)
      error(e.message)
      return {
        abort: () => {
          abort()
        },
      }
    }
  },
}
</script>

<template>
  <div
    class="image-upload-container [&_.filepond--drip]:bg-gray-50! [&_.filepond--drip]:opacity-100! dark:[&_.filepond--drip]:bg-gray-800! dark:[&_.filepond--drop-label]:text-gray-200!"
  >
    <div
      v-if="!isOnline"
      class="bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 rounded-lg text-sm mb-2 dark:bg-yellow-900/30 dark:border-yellow-800 dark:text-yellow-100"
    >
      Internet connection is required to upload images.
    </div>

    <div v-else>
      <div class="mb-2 flex items-center gap-2">
        <button
          type="button"
          @click="openCamera"
          :disabled="isCapturing"
          class="inline-flex items-center gap-2 rounded-sm border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors active:scale-95 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
            />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {{ isCapturing ? "Uploading..." : "Take photo" }}
        </button>

        <input
          ref="cameraInput"
          type="file"
          accept="image/*"
          capture="environment"
          class="hidden"
          @change="handleCameraCapture"
        />
      </div>

      <p v-if="captureError" class="mb-2 text-sm text-red-600 dark:text-red-400">{{ captureError }}</p>

      <FilePond
        ref="pond"
        name="image"
        label-idle="Drag & Drop your image or <span class='filepond--label-action'>Browse</span>"
        :allow-multiple="true"
        accepted-file-types="image/jpeg, image/png"
        max-file-size="20MB"
        :server="serverOptions"
        credits="false"
      />
    </div>
  </div>
</template>

<style>
/* Custom FilePond styles if needed */
.filepond--root {
  margin-bottom: 0;
}
</style>
