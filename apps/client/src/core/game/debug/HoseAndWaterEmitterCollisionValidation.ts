import { DEFAULT_HYDRANT_HOSE_DEFINITION } from "../config/HydrantHoseDefinition";
import type { StaticObstacleDefinition } from "../config/ObstacleDefinition";
import { AirborneWaterCollisionField } from "../environment/AirborneWaterCollisionField";
import { HoseCollisionSystem } from "../physics/rope/HoseCollisionSystem";
import { HoseRope } from "../physics/rope/HoseRope";
import { PhysicsWorld } from "../physics/PhysicsWorld";

/** Focused non-destructive validation for the 8D-7 collision extension. */
export class HoseAndWaterEmitterCollisionValidation {
    public run(): void {
        const hosePass = this.validateHoseStaticCollision();
        this.assertPass("Hose vs Static Obstacle", hosePass);

        const ownership = this.validateEmitterOwnership();
        this.assertPass("Emitter Own-Water Escape", ownership.ownEscape);
        this.assertPass("Foreign-Water Collision", ownership.foreignCollision);

        console.log("[8D-7C] General Hose + Water Emitter Collision: PASS");
    }

    private validateHoseStaticCollision(): boolean {
        const rope = new HoseRope(0, 0, DEFAULT_HYDRANT_HOSE_DEFINITION, 0.5);
        const system = new HoseCollisionSystem(rope, DEFAULT_HYDRANT_HOSE_DEFINITION);
        const obstacle: StaticObstacleDefinition = {
            id: "8d7c-static-rectangle",
            shape: "rectangle",
            positionX: 56,
            positionY: 0,
            width: 20,
            height: 40,
            fillColor: 0,
            outlineColor: 0,
            outlineWidth: 0,
            material: { restitution: 0, collisionFriction: 0 },
        };
        const physicsWorld = new PhysicsWorld();

        physicsWorld.registerStaticDefinition(
            obstacle,
            {
                participation: {
                    rigidBody: false,
                    hose: true,
                    groundWater: false,
                    airborneWater: false,
                },
            },
        );

        return system.resolve(physicsWorld) > 0;
    }

    private validateEmitterOwnership(): {
        readonly ownEscape: boolean;
        readonly foreignCollision: boolean;
    } {
        const field = new AirborneWaterCollisionField();
        field.addCircle(0, 0, 20, "emitter-body", ["source-a"]);

        const ownHit = field.sweep(0, 0, 40, 0, "source-a");
        const foreignHit = field.sweep(0, 0, 40, 0, "source-b");

        return {
            ownEscape: ownHit === null,
            foreignCollision: foreignHit !== null,
        };
    }

    private assertPass(label: string, pass: boolean): void {
        console.log(`[8D-7C] ${label}: ${pass ? "PASS" : "FAIL"}`);
        if (!pass) {
            throw new Error(`[8D-7C] ${label}: FAIL`);
        }
    }
}
