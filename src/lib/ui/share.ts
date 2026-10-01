/** Copy the current URL, which already carries the whole build. Falls back to the Web Share sheet, then to a selectable field. */
export async function copyLink(url: string): Promise<'copied' | 'shared' | 'failed'> {
  try {
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch {
    /* clipboard blocked; try the share sheet */
  }
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ url, title: 'F1 Builder' });
      return 'shared';
    } catch {
      /* dismissed or unsupported */
    }
  }
  return 'failed';
}
