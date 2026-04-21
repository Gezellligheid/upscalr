<template>
  <div
    class="relative border-2 border-dashed rounded-2xl transition-all duration-200 cursor-pointer"
    :class="[
      dragging
        ? 'border-indigo-500 bg-indigo-50 scale-[1.01]'
        : 'border-slate-300 bg-white hover:border-indigo-400 hover:bg-slate-50',
    ]"
    @dragover.prevent="dragging = true"
    @dragleave.prevent="dragging = false"
    @drop.prevent="onDrop"
    @click="triggerInput"
  >
    <input
      ref="inputRef"
      type="file"
      accept="image/jpeg,image/png,image/webp,image/tiff"
      class="hidden"
      @change="onFileChange"
    />
    <div class="flex flex-col items-center justify-center py-20 px-6 text-center select-none">
      <div
        class="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-colors"
        :class="dragging ? 'bg-indigo-100' : 'bg-slate-100'"
      >
        <svg
          class="w-8 h-8 transition-colors"
          :class="dragging ? 'text-indigo-500' : 'text-slate-400'"
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
      <p class="text-base font-semibold text-slate-700">
        {{ dragging ? 'Drop your image here' : 'Drag & drop your image here' }}
      </p>
      <p class="text-sm text-slate-400 mt-1">or click to browse</p>
      <p class="text-xs text-slate-300 mt-4">JPEG, PNG, WebP, TIFF &mdash; large files auto-compressed before upload</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const emit = defineEmits(['image-selected']);
const inputRef = ref(null);
const dragging = ref(false);

function triggerInput() {
  inputRef.value?.click();
}

function onFileChange(e) {
  const f = e.target.files?.[0];
  if (f) emit('image-selected', f);
}

function onDrop(e) {
  dragging.value = false;
  const f = e.dataTransfer.files?.[0];
  if (f) emit('image-selected', f);
}
</script>
