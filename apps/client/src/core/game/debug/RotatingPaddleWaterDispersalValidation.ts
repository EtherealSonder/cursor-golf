export interface RotatingPaddleWaterDispersalValidationSnapshot {
    readonly paddleId: string;
    readonly systemUpdates: number;
    readonly trackedWaterCells: number;
    readonly testedCells: number;
    readonly cellsInsideAnnulus: number;
    readonly eligibleWetCells: number;
    readonly transferAttempts: number;
    readonly successfulTransfers: number;
    readonly transferredWaterAmount: number;
    readonly sourceWaterAmount: number;
    readonly transportedOutsideAmount: number;
    readonly edgeBandWaterAmount: number;
    readonly edgeBandTransferredAmount: number;
    readonly cleanupBandWaterAmount: number;
}

interface MutableCounters {
    systemUpdates: number;
    trackedWaterCells: number;
    testedCells: number;
    cellsInsideAnnulus: number;
    eligibleWetCells: number;
    transferAttempts: number;
    successfulTransfers: number;
    transferredWaterAmount: number;
    sourceWaterAmount: number;
    transportedOutsideAmount: number;
    edgeBandWaterAmount: number;
    edgeBandTransferredAmount: number;
    cleanupBandWaterAmount: number;
}

/** RP-3D diagnostic collector. No gameplay state is modified here. */
export class RotatingPaddleWaterDispersalValidation {
    private readonly counters = new Map<string, MutableCounters>();

    public beginUpdate(paddleId: string, trackedWaterCells: number): void {
        const c = this.getOrCreate(paddleId);
        c.systemUpdates += 1;
        c.trackedWaterCells = trackedWaterCells;
    }
    public recordTested(paddleId: string): void { this.getOrCreate(paddleId).testedCells += 1; }
    public recordInside(paddleId: string): void { this.getOrCreate(paddleId).cellsInsideAnnulus += 1; }
    public recordEligible(paddleId: string): void { this.getOrCreate(paddleId).eligibleWetCells += 1; }
    public recordSourceWater(paddleId: string, amount: number): void {
        if (Number.isFinite(amount) && amount > 0) this.getOrCreate(paddleId).sourceWaterAmount += amount;
    }
    public recordEdgeBand(paddleId: string, amount: number): void {
        if (Number.isFinite(amount) && amount > 0) this.getOrCreate(paddleId).edgeBandWaterAmount += amount;
    }
    public recordEdgeTransfer(paddleId: string, amount: number): void {
        if (Number.isFinite(amount) && amount > 0) this.getOrCreate(paddleId).edgeBandTransferredAmount += amount;
    }
    public recordCleanupBandWater(paddleId: string, amount: number): void {
        if (Number.isFinite(amount) && amount > 0) this.getOrCreate(paddleId).cleanupBandWaterAmount += amount;
    }
    public recordTransferAttempt(paddleId: string): void { this.getOrCreate(paddleId).transferAttempts += 1; }
    public recordTransfer(paddleId: string, amount: number): void {
        const c = this.getOrCreate(paddleId);
        if (Number.isFinite(amount) && amount > 0) {
            c.successfulTransfers += 1;
            c.transferredWaterAmount += amount;
        }
    }

    public recordTransportedOutside(paddleId: string, amount: number): void {
        if (Number.isFinite(amount) && amount > 0) this.getOrCreate(paddleId).transportedOutsideAmount += amount;
    }

    public flushToConsole(): void {
        for (const [paddleId, c] of this.counters) {
            const contact = c.cellsInsideAnnulus > 0 ? "PASS" : "FAIL";
            const transport = c.successfulTransfers > 0 ? "PASS" : "FAIL";
            const displacedPercent = c.sourceWaterAmount > 0
                ? (c.transferredWaterAmount / c.sourceWaterAmount) * 100
                : 0;
            console.info(
`[RP-3D] ROTATING PADDLE WATER

Paddle: ${paddleId}
System updates:           ${c.systemUpdates}
Tracked Water cells:      ${c.trackedWaterCells}
Cells tested:             ${c.testedCells}
Cells inside annulus:     ${c.cellsInsideAnnulus}
Eligible wet cells:       ${c.eligibleWetCells}

Transfer attempts:        ${c.transferAttempts}
Successful transfers:     ${c.successfulTransfers}
Water moved this interval:${c.transferredWaterAmount.toFixed(4)}
Source Water sampled:     ${c.sourceWaterAmount.toFixed(4)}
Displaced percentage:    ${displacedPercent.toFixed(1)}%
Transported outside:     ${c.transportedOutsideAmount.toFixed(4)}
Edge-band Water sampled: ${c.edgeBandWaterAmount.toFixed(4)}
Edge-band Water moved:   ${c.edgeBandTransferredAmount.toFixed(4)}
Cleanup-band Water:      ${c.cleanupBandWaterAmount.toFixed(4)}

CONTACT DETECTION: ${contact}
DEPTH TRANSPORT:   ${transport}`
            );
        }
        this.counters.clear();
    }

    private getOrCreate(paddleId: string): MutableCounters {
        let c = this.counters.get(paddleId);
        if (!c) {
            c = {
                systemUpdates: 0, trackedWaterCells: 0, testedCells: 0,
                cellsInsideAnnulus: 0, eligibleWetCells: 0, transferAttempts: 0,
                successfulTransfers: 0, transferredWaterAmount: 0,
                sourceWaterAmount: 0, transportedOutsideAmount: 0,
                edgeBandWaterAmount: 0, edgeBandTransferredAmount: 0,
                cleanupBandWaterAmount: 0,
            };
            this.counters.set(paddleId, c);
        }
        return c;
    }
}
