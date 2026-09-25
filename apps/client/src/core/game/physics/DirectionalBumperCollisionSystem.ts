import type { Ball } from "../entities/Ball";
import type { DirectionalBumper } from "../entities/mechanisms/DirectionalBumper";
import type { DynamicCollidable } from "./DynamicCollidable";
import { detectDynamicCollidableAgainstFixedCollision } from "./DynamicCollidableCollision";
import type { PhysicsWorld } from "./PhysicsWorld";

export interface DirectionalBumperCollisionDiagnostic {
    readonly physicalContact: boolean;
    readonly poweredHit: boolean;
    readonly reason: "no-contact" | "latched" | "separating" | "ordinary-bounce" | "powered-hit";
}

export interface DirectionalBumperContactDebug {
    readonly x: number; readonly y: number;
    readonly normalX: number; readonly normalY: number;
    readonly outgoingX: number; readonly outgoingY: number;
}

/**
 * DB-4 authoritative response against the actual moving arm.
 * Ball keeps its tuned DB-2 response. Every movable DynamicCollidable receives
 * the same physical-contact requirement with a mass-aware powered impulse.
 */
export class DirectionalBumperCollisionSystem {
    private ballContactLatched = false;
    private readonly activeDynamicContacts = new Set<string>();
    private lastContact: DirectionalBumperContactDebug | null = null;
    private pendingPoweredImpact: DirectionalBumperContactDebug | null = null;
    private lastDiagnostic: DirectionalBumperCollisionDiagnostic = { physicalContact: false, poweredHit: false, reason: "no-contact" };

    public resolve(ball: Ball, bumper: DirectionalBumper, physicsWorld?: PhysicsWorld): boolean {
        const ballHit = this.resolveBall(ball, bumper);
        const dynamicHits = physicsWorld ? this.resolveDynamicBodies(physicsWorld, bumper) : 0;
        return ballHit || dynamicHits > 0;
    }

    private resolveBall(ball: Ball, bumper: DirectionalBumper): boolean {
        const shape = bumper.getCollisionShape();
        const collision = circleAgainstOrientedRectangle(
            ball.getX(), ball.getY(), ball.getRadius(), shape.positionX, shape.positionY,
            shape.rotationRadians, shape.width, shape.height,
        );
        if (!collision) {
            this.ballContactLatched = false;
            this.lastDiagnostic = { physicalContact: false, poweredHit: false, reason: "no-contact" };
            return false;
        }
        ball.translate(collision.normalX * (collision.penetration + 0.25), collision.normalY * (collision.penetration + 0.25));
        if (this.ballContactLatched) {
            this.lastDiagnostic = { physicalContact: true, poweredHit: false, reason: "latched" };
            return false;
        }
        const incomingX = ball.getVelocityX(), incomingY = ball.getVelocityY();
        const incomingNormalSpeed = incomingX * collision.normalX + incomingY * collision.normalY;
        const surface = bumper.getSurfaceVelocityAtWorldPoint(collision.contactX, collision.contactY);
        const armNormalSpeed = surface.x * collision.normalX + surface.y * collision.normalY;
        const relativeNormalSpeed = incomingNormalSpeed - armNormalSpeed;
        if (relativeNormalSpeed >= 0 && Math.abs(armNormalSpeed) < 1) {
            this.lastDiagnostic = { physicalContact: true, poweredHit: false, reason: "separating" };
            return false;
        }
        this.ballContactLatched = true;
        const definition = bumper.getDefinition();
        if (bumper.getState() !== "strike" && bumper.getState() !== "hold") {
            if (incomingNormalSpeed < 0) {
                const r = definition.material.restitution;
                ball.applyDirectionalBumperVelocity(
                    incomingX - (1 + r) * incomingNormalSpeed * collision.normalX,
                    incomingY - (1 + r) * incomingNormalSpeed * collision.normalY,
                );
            }
            this.lastDiagnostic = { physicalContact: true, poweredHit: false, reason: "ordinary-bounce" };
            return true;
        }
        const incomingSpeed = Math.hypot(incomingX, incomingY);
        const distanceFromPivot = Math.hypot(collision.contactX - bumper.getX(), collision.contactY - bumper.getY());
        const tipT = clamp(distanceFromPivot / definition.armLength, 0, 1);
        const tipStrength = definition.minimumTipStrength + (definition.maximumTipStrength - definition.minimumTipStrength) * tipT;
        const rotationalContribution = Math.max(0, armNormalSpeed) * definition.rotationalVelocityContribution;
        const launchSpeed = Math.min(definition.maximumLaunchSpeed, Math.max(
            definition.minimumLaunchSpeed,
            incomingSpeed * definition.launchSpeedMultiplier * tipStrength + rotationalContribution,
        ));
        const tangentX = -collision.normalY, tangentY = collision.normalX;
        const tangentCarry = (incomingX * tangentX + incomingY * tangentY) * 0.16;
        let outgoingX = collision.normalX * launchSpeed + tangentX * tangentCarry;
        let outgoingY = collision.normalY * launchSpeed + tangentY * tangentCarry;
        const outgoingSpeed = Math.hypot(outgoingX, outgoingY);
        if (outgoingSpeed > definition.maximumLaunchSpeed && outgoingSpeed > 0) {
            const scale = definition.maximumLaunchSpeed / outgoingSpeed;
            outgoingX *= scale; outgoingY *= scale;
        }
        ball.applyDirectionalBumperVelocity(outgoingX, outgoingY);
        this.publishPoweredImpact(bumper, collision.contactX, collision.contactY, collision.normalX, collision.normalY, outgoingX, outgoingY);
        this.lastDiagnostic = { physicalContact: true, poweredHit: true, reason: "powered-hit" };
        return true;
    }

    private resolveDynamicBodies(physicsWorld: PhysicsWorld, bumper: DirectionalBumper): number {
        const shape = bumper.getCollisionShape();
        const contactsThisFrame = new Set<string>();
        let poweredCount = 0;
        for (const body of physicsWorld.getMovableRigidDynamicCollidables()) {
            const manifold = detectDynamicCollidableAgainstFixedCollision(body, shape);
            if (!manifold) continue;
            const id = body.getDefinition().id;
            contactsThisFrame.add(id);
            body.translate(manifold.normalX * (manifold.penetrationDepth + 0.02), manifold.normalY * (manifold.penetrationDepth + 0.02));
            if (this.activeDynamicContacts.has(id)) continue;
            if (bumper.getState() !== "strike" && bumper.getState() !== "hold") continue;

            const vx = body.getVelocityX(), vy = body.getVelocityY();
            const incomingSpeed = Math.hypot(vx, vy);
            const surface = bumper.getSurfaceVelocityAtWorldPoint(manifold.contactPointX, manifold.contactPointY);
            const armNormalSpeed = surface.x * manifold.normalX + surface.y * manifold.normalY;
            const incomingNormalSpeed = vx * manifold.normalX + vy * manifold.normalY;
            if (incomingSpeed < bumper.getDefinition().genericMinimumImpactSpeed && Math.abs(armNormalSpeed) < bumper.getDefinition().genericMinimumImpactSpeed) continue;
            if (incomingNormalSpeed - armNormalSpeed >= 0 && Math.abs(armNormalSpeed) < 1) continue;

            const inverseMass = body.getInverseMass();
            if (inverseMass <= 0) continue;
            const mass = 1 / inverseMass;
            const d = bumper.getDefinition();
            const massFactor = calculateMassFactor(mass, d.genericReferenceMass, d.genericMassResponseExponent, d.genericMinimumMassFactor, d.genericMaximumMassFactor);
            const distanceFromPivot = Math.hypot(manifold.contactPointX - bumper.getX(), manifold.contactPointY - bumper.getY());
            const tipT = clamp(distanceFromPivot / d.armLength, 0, 1);
            const tipStrength = d.minimumTipStrength + (d.maximumTipStrength - d.minimumTipStrength) * tipT;
            const rotationalContribution = Math.max(0, armNormalSpeed) * d.rotationalVelocityContribution;
            const targetSpeed = Math.min(d.genericMaximumLaunchSpeed, Math.max(
                d.genericMinimumLaunchSpeed,
                Math.max(incomingSpeed, d.genericMinimumImpactSpeed) * d.genericLaunchSpeedMultiplier * massFactor * tipStrength + rotationalContribution * massFactor,
            ));
            const tangentX = -manifold.normalY, tangentY = manifold.normalX;
            const tangentCarry = (vx * tangentX + vy * tangentY) * 0.12;
            let targetVX = manifold.normalX * targetSpeed + tangentX * tangentCarry;
            let targetVY = manifold.normalY * targetSpeed + tangentY * tangentCarry;
            const targetMagnitude = Math.hypot(targetVX, targetVY);
            if (targetMagnitude > d.genericMaximumLaunchSpeed && targetMagnitude > 0) {
                const scale = d.genericMaximumLaunchSpeed / targetMagnitude;
                targetVX *= scale; targetVY *= scale;
            }
            body.applyImpulseAtWorldPoint((targetVX - vx) * mass, (targetVY - vy) * mass, manifold.contactPointX, manifold.contactPointY);
            body.notifyExternalImpact?.({ sourceKind: "other", sourceId: shape.id, positionX: manifold.contactPointX, positionY: manifold.contactPointY });
            this.publishPoweredImpact(bumper, manifold.contactPointX, manifold.contactPointY, manifold.normalX, manifold.normalY, targetVX, targetVY);
            poweredCount += 1;
        }
        this.activeDynamicContacts.clear();
        for (const id of contactsThisFrame) this.activeDynamicContacts.add(id);
        return poweredCount;
    }

    private publishPoweredImpact(bumper: DirectionalBumper, x: number, y: number, normalX: number, normalY: number, outgoingX: number, outgoingY: number): void {
        this.lastContact = { x, y, normalX, normalY, outgoingX, outgoingY };
        this.pendingPoweredImpact = this.lastContact;
    }

    public consumePoweredImpact(): DirectionalBumperContactDebug | null { const v = this.pendingPoweredImpact; this.pendingPoweredImpact = null; return v; }
    public getLastContact(): DirectionalBumperContactDebug | null { return this.lastContact; }
    public getLastDiagnostic(): DirectionalBumperCollisionDiagnostic { return this.lastDiagnostic; }
    public reset(): void { this.ballContactLatched = false; this.activeDynamicContacts.clear(); this.lastContact = null; this.pendingPoweredImpact = null; this.lastDiagnostic = { physicalContact: false, poweredHit: false, reason: "no-contact" }; }
}

interface CircleRectangleContact { readonly normalX:number; readonly normalY:number; readonly penetration:number; readonly contactX:number; readonly contactY:number; }
function circleAgainstOrientedRectangle(circleX:number,circleY:number,radius:number,rectX:number,rectY:number,rotation:number,width:number,height:number):CircleRectangleContact|null {
    const cos=Math.cos(rotation),sin=Math.sin(rotation),dx=circleX-rectX,dy=circleY-rectY;
    const localX=dx*cos+dy*sin,localY=-dx*sin+dy*cos,halfWidth=width*.5,halfHeight=height*.5;
    const closestX=clamp(localX,-halfWidth,halfWidth),closestY=clamp(localY,-halfHeight,halfHeight);
    let sx=localX-closestX,sy=localY-closestY,distance=Math.hypot(sx,sy); if(distance>=radius)return null;
    if(distance<.00001){const tx=halfWidth-Math.abs(localX),ty=halfHeight-Math.abs(localY);if(tx<ty){sx=localX>=0?1:-1;sy=0;}else{sx=0;sy=localY>=0?1:-1;}distance=1;}
    const lnx=sx/distance,lny=sy/distance,nx=lnx*cos-lny*sin,ny=lnx*sin+lny*cos;
    return {normalX:nx,normalY:ny,penetration:radius-Math.min(radius,Math.hypot(localX-closestX,localY-closestY)),contactX:rectX+closestX*cos-closestY*sin,contactY:rectY+closestX*sin+closestY*cos};
}
function calculateMassFactor(mass:number,reference:number,exponent:number,min:number,max:number):number { const raw=Math.pow(reference/Math.max(.0001,mass),exponent); return clamp(raw,min,max); }
function clamp(v:number,min:number,max:number):number{return Math.max(min,Math.min(max,v));}
