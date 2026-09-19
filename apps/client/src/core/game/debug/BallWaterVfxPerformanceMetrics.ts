export class BallWaterVfxPerformanceMetrics {
    private elapsed=0; private pulses=0; private emitted=0; private rejected=0;
    private peakAir=0; private peakGround=0; private updateMs=0; private traversalMs=0;
    public recordTraversalPulses(n:number):void{if(Number.isFinite(n)&&n>0)this.pulses+=Math.floor(n);}
    public recordEmission(emitted:number,rejected:number):void{
        if(Number.isFinite(emitted)&&emitted>0)this.emitted+=Math.floor(emitted);
        if(Number.isFinite(rejected)&&rejected>0)this.rejected+=Math.floor(rejected);
    }
    public recordUpdateMs(ms:number):void{if(Number.isFinite(ms)&&ms>=0)this.updateMs+=ms;}
    public recordTraversalMs(ms:number):void{if(Number.isFinite(ms)&&ms>=0)this.traversalMs+=ms;}
    public update(dt:number,air:number,ground:number,airCap:number,groundCap:number,airMax:number,groundMax:number):void{
        if(!Number.isFinite(dt)||dt<=0)return;
        this.elapsed+=dt; this.peakAir=Math.max(this.peakAir,air); this.peakGround=Math.max(this.peakGround,ground);
        if(this.elapsed<1)return;
        const s=Math.max(.001,this.elapsed);
        console.log("[8I-BALL-VFX-PERF]",
            `pulses/s=${(this.pulses/s).toFixed(1)}`,
            `emitted/s=${(this.emitted/s).toFixed(1)}`,
            `rejected/s=${(this.rejected/s).toFixed(1)}`,
            `activeAir=${air}`,`activeGround=${ground}`,
            `peakAir=${this.peakAir}`,`peakGround=${this.peakGround}`,
            `poolAir=${airCap}/${airMax}`,`poolGround=${groundCap}/${groundMax}`,
            `vfxMs/s=${(this.updateMs/s).toFixed(3)}`,
            `traversalMs/s=${(this.traversalMs/s).toFixed(3)}`);
        this.elapsed=0;this.pulses=0;this.emitted=0;this.rejected=0;this.peakAir=air;this.peakGround=ground;this.updateMs=0;this.traversalMs=0;
    }
    public reset():void{this.elapsed=0;this.pulses=0;this.emitted=0;this.rejected=0;this.peakAir=0;this.peakGround=0;this.updateMs=0;this.traversalMs=0;}
}
