import { IncomingForm } from 'formidable';
import sharp from 'sharp';
import { readFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';

// Sharpen presets — tuned for upscaled photographic content
const SHARPEN = {
  0:   null,
  0.5: { sigma: 0.5, m1: 0.8,  m2: 0.1 },
  1.0: { sigma: 0.8, m1: 2.0,  m2: 0.5 },
  2.0: { sigma: 1.2, m1: 4.0,  m2: 1.2 },
};

// Deblur levels 1–3: increasing aggressiveness
// Level 1 (Light)  — single pass, mild unsharp mask
// Level 2 (Medium) — single pass, stronger broad-blur recovery
// Level 3 (Strong) — two passes: broad then fine detail recovery
async function deblurBuffer(inputBuffer, level) {
  if (level === 1) {
    return sharp(inputBuffer)
      .sharpen({ sigma: 1.5, m1: 2.0, m2: 0.1, x1: 4, y2: 15, y3: 5 })
      .toBuffer();
  }
  if (level === 2) {
    return sharp(inputBuffer)
      .sharpen({ sigma: 2.5, m1: 4.0, m2: 0.2, x1: 4, y2: 25, y3: 8 })
      .toBuffer();
  }
  // level 3: broad pass then fine-detail recovery pass
  const pass1 = await sharp(inputBuffer)
    .sharpen({ sigma: 2.5, m1: 4.0, m2: 0.2, x1: 4, y2: 25, y3: 8 })
    .toBuffer();
  return sharp(pass1)
    .sharpen({ sigma: 0.6, m1: 1.5, m2: 0.3 })
    .toBuffer();
}

async function upscalePass(inputBuffer, targetWidth, targetHeight, sharpen) {
  let pipe = sharp(inputBuffer).resize(targetWidth, targetHeight, {
    kernel: sharp.kernel.lanczos3,
    fastShrinkOnLoad: false,
  });

  if (sharpen) {
    pipe = pipe.sharpen(sharpen);
  }

  return pipe.toBuffer();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const form = new IncomingForm({
    maxFileSize: 50 * 1024 * 1024,
    keepExtensions: true,
    uploadDir: tmpdir(),
  });

  let fields, files;
  try {
    [fields, files] = await form.parse(req);
  } catch (err) {
    return res.status(400).json({ error: 'Failed to parse upload: ' + err.message });
  }

  const imageFile = files.image?.[0];
  if (!imageFile) {
    return res.status(400).json({ error: 'No image uploaded.' });
  }

  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/tiff'];
  if (!allowed.includes(imageFile.mimetype)) {
    return res.status(400).json({ error: 'Unsupported file type. Use JPEG, PNG, WebP, or TIFF.' });
  }

  try {
    const scale = parseFloat(fields.scale?.[0]) || 2;
    const sharpenKey = parseFloat(fields.sharpen?.[0]) || 0;
    const deblurLevel = Math.min(Math.max(parseInt(fields.deblur?.[0]) || 0, 0), 3);
    const clampedScale = Math.min(Math.max(scale, 1.5), 4);
    const sharpenOpts = SHARPEN[sharpenKey] ?? SHARPEN[1.0];

    let imageBuffer = readFileSync(imageFile.filepath);
    if (deblurLevel > 0) imageBuffer = await deblurBuffer(imageBuffer, deblurLevel);
    const meta = await sharp(imageBuffer).metadata();

    const MAX_INPUT_PIXELS = 25_000_000; // ~5000×5000
    if (meta.width * meta.height > MAX_INPUT_PIXELS) {
      return res.status(400).json({ error: `Image too large. Maximum input size is 25 megapixels (e.g. 5000×5000). Yours is ${meta.width}×${meta.height}.` });
    }

    const newWidth  = Math.round(meta.width  * clampedScale);
    const newHeight = Math.round(meta.height * clampedScale);
    const outputFormat = meta.format === 'png' ? 'png' : 'jpeg';

    let processed;

    if (clampedScale === 4) {
      // Two-pass: 2x with a light mid-pass sharpen, then 2x to final size
      const midWidth  = meta.width  * 2;
      const midHeight = meta.height * 2;

      // Mid-pass: gentle sharpen to recover Lanczos softness at 2x
      const midBuf = await upscalePass(imageBuffer, midWidth, midHeight, {
        sigma: 0.5, m1: 0.8, m2: 0.0,
      });

      // Final pass: full target size + user-selected sharpening
      processed = await sharp(midBuf)
        .resize(newWidth, newHeight, { kernel: sharp.kernel.lanczos3, fastShrinkOnLoad: false })
        .clahe({ width: 64, height: 64, maxSlope: 2 })  // local contrast boost
        .sharpen(sharpenOpts ?? { sigma: 0.5, m1: 0.8, m2: 0.1 })
        .toFormat(outputFormat, { quality: 92 })
        .toBuffer();
    } else {
      // Single-pass for 2x / 3x
      const useClahe = newWidth * newHeight < 16_000_000; // skip CLAHE on very large outputs
      let pipe = sharp(imageBuffer)
        .resize(newWidth, newHeight, { kernel: sharp.kernel.lanczos3, fastShrinkOnLoad: false });
      if (useClahe) pipe = pipe.clahe({ width: 64, height: 64, maxSlope: 2 });

      if (sharpenOpts) pipe = pipe.sharpen(sharpenOpts);

      processed = await pipe
        .toFormat(outputFormat, { quality: 92 })
        .toBuffer();
    }

    try { unlinkSync(imageFile.filepath); } catch {}

    const mimeType = outputFormat === 'png' ? 'image/png' : 'image/jpeg';
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Access-Control-Expose-Headers', 'X-Original-Width,X-Original-Height,X-New-Width,X-New-Height');
    res.setHeader('X-Original-Width',  String(meta.width));
    res.setHeader('X-Original-Height', String(meta.height));
    res.setHeader('X-New-Width',       String(newWidth));
    res.setHeader('X-New-Height',      String(newHeight));
    res.status(200).send(processed);
  } catch (err) {
    console.error('Upscale error:', err);
    res.status(500).json({ error: err.message || 'Failed to process image.' });
  }
}
