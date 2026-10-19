/** DOM status is updated only on window transitions; no Pixi draw work. */
export class PerformanceDiagnosticStatusOverlay {
    private static element: HTMLDivElement | null = null;
    public static show(text: string, complete = false): void {
        if (typeof document === 'undefined') return;
        if (!this.element) {
            const element = document.createElement('div');
            element.id = 'performance-diagnostic-status';
            element.style.cssText = 'position:fixed;top:14px;left:50%;transform:translateX(-50%);z-index:2147483647;pointer-events:none;background:rgba(16,29,38,.93);color:#f1f8fb;border:1px solid #70c5b4;border-radius:10px;padding:12px 18px;font:600 14px/1.5 system-ui,sans-serif;text-align:center;box-shadow:0 3px 18px #0006;min-width:320px';
            document.body.appendChild(element);
            this.element = element;
        }
        this.element.textContent = text;
        this.element.style.borderColor = complete ? '#8be0a3' : '#70c5b4';
    }
    public static baselineComplete(): void { this.show('BASELINE COMPLETE | 12/12 — You can now open DevTools and copy the console summary.', true); }
    public static complete(): void { this.show('P3-B1 COMPLETE | 12/12 — You can now open DevTools and copy the console summary.', true); }
}
