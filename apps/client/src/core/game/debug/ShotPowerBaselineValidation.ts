import type { Ball } from "../entities/Ball";
import { DEFAULT_SHOT_POWER_MODEL } from "../physics/ShotPowerModel";

interface Row { power: string; normalizedPower: number; launchVelocity: number; expectedDistance: number; actualDistance: number; errorPercent: number; }

export class ShotPowerBaselineValidation {
    private readonly powers = [0.10,0.20,0.30,0.40,0.50,0.60,0.70,0.80,0.90,1.00] as const;
    private readonly rows: Row[] = [];
    private index = 0;
    private active = false;
    private complete = false;
    public constructor(private readonly ball: Ball, private readonly x: number, private readonly y: number) {
        ball.setShotPowerBaselineValidationMode(true);
        console.log("[4A] Automated Normal Grass baseline started. Do not provide player input.");
    }
    public update(): void {
        if (this.complete) return;
        const power = this.powers[this.index];
        if (power === undefined) { this.finish(); return; }
        if (!this.active) {
            this.ball.prepareShotPowerBaselineValidationShot(this.x, this.y);
            if (!this.ball.launch(power, -Math.PI / 2)) {
                console.error(
                    `[4A] Launch rejected at ${Math.round(power * 100)}%.`,
                    this.ball.getShotPowerBaselineValidationState(),
                );
                this.finish(false);
                return;
            }
            this.active = true;
            return;
        }
        if (this.ball.isMoving()) return;
        const expected = DEFAULT_SHOT_POWER_MODEL.getExpectedBaselineTravelDistance(power);
        const actual = this.ball.getMovementDistanceTravelled();
        this.rows.push({ power: `${Math.round(power*100)}%`, normalizedPower: power, launchVelocity: +this.ball.getMostRecentLaunchSpeed().toFixed(2), expectedDistance: +expected.toFixed(2), actualDistance: +actual.toFixed(2), errorPercent: +(((actual-expected)/expected)*100).toFixed(2) });
        console.log(
            `[4A] Recorded ${Math.round(power * 100)}%: ` +
            `${actual.toFixed(2)} px actual / ${expected.toFixed(2)} px expected.`,
        );
        this.index++;
        this.active = false;
    }
    private finish(ok=true): void {
        if (this.complete) return; this.complete=true;
        console.log("[4A] SHOT POWER BASELINE VALIDATION"); console.table(this.rows);
        const mv=this.rows.every((r,i)=>i===0||r.launchVelocity>this.rows[i-1]!.launchVelocity);
        const md=this.rows.every((r,i)=>i===0||r.actualDistance>this.rows[i-1]!.actualDistance);
        const maxErr=this.rows.reduce((m,r)=>Math.max(m,Math.abs(r.errorPercent)),0);
        const jumps=this.rows.slice(1).map((r,i)=>r.actualDistance-this.rows[i]!.actualDistance);
        const avg=jumps.length?jumps.reduce((a,b)=>a+b,0)/jumps.length:0;
        const spread=avg>0?Math.max(...jumps.map(j=>Math.abs(j-avg)))/avg:0;
        console.log(`[4A] Monotonic launch velocity: ${mv?"PASS":"FAIL"}`);
        console.log(`[4A] Monotonic travel distance: ${md?"PASS":"FAIL"}`);
        console.log(`[4A] Expected-distance progression: ${spread<=0.15?"PASS":"FAIL"}`);
        console.log(`[4A] Maximum distance error: ${maxErr.toFixed(2)}%`);
        console.log(`[4A] Largest adjacent distance jump: ${(jumps.length?Math.max(...jumps):0).toFixed(2)} px`);
        console.log(`[4A] RESULT: ${ok&&mv&&md&&spread<=0.15&&maxErr<=5?"PASS":"REVIEW"}`);
    }
}
