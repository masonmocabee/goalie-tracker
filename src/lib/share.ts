export type ShareResult = 'shared' | 'downloaded' | 'cancelled';

/**
 * Hand a file to the Android share sheet (so it can go straight to Google Drive) when the
 * browser allows sharing that file; otherwise download it.
 */
export async function shareOrDownload(filename: string, text: string, type: string): Promise<ShareResult> {
  const file = new File([text], filename, { type });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
      return 'shared';
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled';
      // Any other share failure: fall back to a download.
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return 'downloaded';
}
