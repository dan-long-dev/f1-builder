/** One-line feedback at the bottom of the stage. */
export class Toast {
  private timer: ReturnType<typeof setTimeout> | null = null;
  constructor(private el: HTMLElement) {}

  show(text: string, opts: { input?: string; ms?: number } = {}): void {
    this.el.replaceChildren();
    const span = document.createElement('span');
    span.textContent = text;
    this.el.append(span);
    if (opts.input) {
      const input = document.createElement('input');
      input.className = 'toast__input';
      input.readOnly = true;
      input.value = opts.input;
      input.addEventListener('focus', () => input.select());
      this.el.append(input);
      queueMicrotask(() => {
        input.focus();
        input.select();
      });
    }
    this.el.classList.add('is-on');
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.el.classList.remove('is-on'), opts.ms ?? (opts.input ? 8000 : 2200));
  }
}
