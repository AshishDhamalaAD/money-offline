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
  <div class="image-upload-container">
    <div v-if="!isOnline" class="bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 rounded-lg text-sm mb-2">
      Internet connection is required to upload images.
    </div>

    <div v-else>
      <FilePond
        ref="pond"
        name="image"
        label-idle="Drag & Drop your image or <span class='filepond--label-action'>Browse</span>"
        :allow-multiple="true"
        accepted-file-types="image/jpeg, image/png"
        max-file-size="5MB"
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
