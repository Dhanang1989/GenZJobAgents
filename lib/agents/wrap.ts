/**
 * Membungkus data tak tepercaya (teks lowongan, CV) dalam tag XML untuk user message.
 * Tag pembuka/penutup di dalam data di-escape agar data tidak bisa "keluar" dari tag-nya.
 */
export function wrapUntrusted(tag: string, content: string): string {
  if (!/^[a-z_]+$/.test(tag)) throw new Error(`Tag tidak valid: ${tag}`);
  const escaped = content.replace(/<\s*(\/?)\s*([a-z_]+)[^>]*>/gi, (_m, slash: string, name: string) => `‹${slash}${name}›`);
  return `<${tag}>\n${escaped}\n</${tag}>`;
}
