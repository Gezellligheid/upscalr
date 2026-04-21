<template>
  <div class="min-h-screen bg-slate-50">
    <!-- Header -->
    <header class="bg-white border-b border-slate-200 shadow-sm">
      <div class="max-w-5xl mx-auto px-6 py-4 flex items-center gap-3">
        <div class="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center">
          <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <h1 class="text-xl font-bold text-slate-900 leading-none">Upscalr</h1>
          <p class="text-xs text-slate-500 mt-0.5">Sharpen & upscale your images</p>
        </div>
      </div>
    </header>

    <main class="max-w-5xl mx-auto px-6 py-10">
      <!-- Upload area -->
      <div v-if="!originalUrl" class="space-y-6">
        <div class="text-center">
          <h2 class="text-3xl font-bold text-slate-900">Upscale your image</h2>
          <p class="mt-2 text-slate-500 text-base">Upload an image to enhance its resolution and sharpness</p>
        </div>
        <ImageUploader @image-selected="onImageSelected" />
      </div>

      <!-- Settings + Result -->
      <div v-else class="space-y-6">
        <!-- Top bar -->
        <div class="flex items-center justify-between">
          <button
            @click="reset"
            class="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
            Upload another image
          </button>
          <span class="text-sm text-slate-400">{{ fileName }}</span>
        </div>

        <!-- Settings card -->
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-sm font-semibold text-slate-700">Upscale settings</h3>
            <!-- Deblur toggle -->
            <label class="flex items-center gap-2 cursor-pointer select-none">
              <span class="text-xs font-medium text-slate-500">Deblur</span>
              <button
                @click="deblur = !deblur"
                :class="[
                  'relative w-9 h-5 rounded-full transition-colors',
                  deblur ? 'bg-indigo-600' : 'bg-slate-200',
                ]"
              >
                <span
                  :class="[
                    'absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
                    deblur ? 'translate-x-4' : 'translate-x-0',
                  ]"
                />
              </button>
            </label>
          </div>
          <div class="flex flex-wrap gap-6">
            <!-- Scale -->
            <div class="flex-1 min-w-[160px]">
              <label class="block text-xs font-medium text-slate-500 mb-2">Scale factor</label>
              <div class="flex gap-2">
                <button
                  v-for="s in [2, 3, 4]"
                  :key="s"
                  @click="scale = s"
                  :class="[
                    'flex-1 py-2 rounded-xl text-sm font-semibold border transition-all',
                    scale === s
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600',
                  ]"
                >
                  {{ s }}x
                </button>
              </div>
            </div>

            <!-- Sharpen -->
            <div class="flex-1 min-w-[200px]">
              <label class="block text-xs font-medium text-slate-500 mb-2">
                Sharpening &mdash; <span class="text-indigo-600 font-semibold">{{ sharpenLabels[sharpen] }}</span>
              </label>
              <input
                type="range"
                min="0" max="3" step="1"
                v-model.number="sharpen"
                class="w-full accent-indigo-600 h-2 rounded-full cursor-pointer"
              />
              <div class="flex justify-between text-xs text-slate-400 mt-1">
                <span>None</span>
                <span>Light</span>
                <span>Medium</span>
                <span>Strong</span>
              </div>
            </div>

            <!-- Process button -->
            <div class="flex items-end">
              <button
                @click="processImage"
                :disabled="processing"
                class="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-all shadow-sm flex items-center gap-2"
              >
                <svg v-if="processing" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3l14 9-14 9V3z" />
                </svg>
                {{ processing ? 'Processing…' : 'Upscale' }}
              </button>
            </div>
          </div>

          <!-- Error -->
          <div v-if="error" class="mt-4 px-4 py-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl">
            {{ error }}
          </div>
        </div>

        <!-- Before / After slider -->
        <div v-if="resultUrl" class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 class="text-sm font-semibold text-slate-700">Before &amp; After</h3>
              <p class="text-xs text-slate-400 mt-0.5">Drag the slider to compare</p>
            </div>
            <div class="flex items-center gap-3 text-xs text-slate-500">
              <span>Original: {{ origDim }}</span>
              <svg class="w-3 h-3 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
              <span class="text-indigo-600 font-medium">Upscaled: {{ newDim }}</span>
            </div>
          </div>
          <BeforeAfterSlider :before="originalUrl" :after="resultUrl" />
          <div class="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
            <a
              :href="resultUrl"
              :download="downloadName"
              class="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition-all shadow-sm"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download upscaled image
            </a>
          </div>
        </div>

        <!-- Preview original if no result yet -->
        <div v-else class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div class="px-6 py-4 border-b border-slate-100">
            <h3 class="text-sm font-semibold text-slate-700">Original image</h3>
          </div>
          <div class="flex items-center justify-center bg-slate-50 p-6">
            <img :src="originalUrl" alt="Original" class="max-h-96 max-w-full rounded-xl object-contain shadow" />
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import ImageUploader from './components/ImageUploader.vue';
import BeforeAfterSlider from './components/BeforeAfterSlider.vue';

const originalUrl = ref(null);
const resultUrl   = ref(null);
const fileName    = ref('');
const file        = ref(null);
const scale       = ref(2);
const sharpen     = ref(1);
const deblur      = ref(false);
const processing  = ref(false);
const error       = ref(null);
const origDim     = ref('');
const newDim      = ref('');

const sharpenLabels  = ['None', 'Light', 'Medium', 'Strong'];
const sharpenValues  = [0, 0.5, 1.0, 2.0];

const downloadName = computed(() => {
  const parts = fileName.value.split('.');
  const ext = parts.pop();
  return `${parts.join('.')}_upscaled_${scale.value}x.${ext === 'png' ? 'png' : 'jpg'}`;
});

function onImageSelected(selectedFile) {
  file.value        = selectedFile;
  fileName.value    = selectedFile.name;
  originalUrl.value = URL.createObjectURL(selectedFile);
  resultUrl.value   = null;
  error.value       = null;

  const img = new Image();
  img.onload = () => { origDim.value = `${img.width}×${img.height}`; };
  img.src = originalUrl.value;
}

async function processImage() {
  if (!file.value) return;
  processing.value = true;
  error.value      = null;
  resultUrl.value  = null;

  try {
    const formData = new FormData();
    formData.append('image',   file.value);
    formData.append('scale',   scale.value);
    formData.append('sharpen', sharpenValues[sharpen.value]);
    formData.append('deblur',  deblur.value);

    const res = await fetch('/api/upscale', { method: 'POST', body: formData });

    if (!res.ok) {
      let message = `Server error (${res.status})`;
      try { const e = await res.json(); message = e.error || message; } catch {}
      throw new Error(message);
    }

    const w = res.headers.get('X-New-Width');
    const h = res.headers.get('X-New-Height');
    if (w && h) newDim.value = `${w}×${h}`;

    const blob = await res.blob();
    resultUrl.value = URL.createObjectURL(blob);
  } catch (e) {
    error.value = e.message;
  } finally {
    processing.value = false;
  }
}

function reset() {
  originalUrl.value = null;
  resultUrl.value   = null;
  file.value        = null;
  fileName.value    = '';
  error.value       = null;
  origDim.value     = '';
  newDim.value      = '';
  deblur.value      = false;
}
</script>
