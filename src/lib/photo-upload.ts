/** Input formats decoded by modern browsers; analysis receives normalized JPEG. */
export function isSupportedPhoto(file: { type: string; name: string; size: number }) {
  const types = ["image/jpeg", "image/png", "image/webp", "image/avif"];
  const knownExtension = /\.(jpe?g|png|webp|avif)$/i.test(file.name);
  return (types.includes(file.type) || (!file.type && knownExtension)) && file.size > 0 && file.size <= 8 * 1024 * 1024;
}