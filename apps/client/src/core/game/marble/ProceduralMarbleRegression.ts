import { marbleTargetForArea } from "./ProceduralMarbleConfig";
import { generateProceduralMarbles, isMarblePositionFree, polygonArea } from "./ProceduralMarblePlacementController";
import type { GeneratedCourseGeometry } from "../level/LevelRuntimeDefinition";
/** Lightweight opt-in assertions; not executed in normal gameplay. */
export function runProceduralMarbleRegression(): void {
    const geometry = { vertices: [{x:0,y:0},{x:300,y:0},{x:300,y:200},{x:0,y:200}],
        bounds: { minimumX:0, maximumX:300, minimumY:0, maximumY:200 }, edges: [], wallSegments: [] } as GeneratedCourseGeometry;
    const assert = (value: boolean, message: string) => { if (!value) throw new Error(`Marble regression: ${message}`); };
    assert(polygonArea(geometry.vertices) === 60_000, "polygon area");
    assert(marbleTargetForArea(60_000) === 3, "area density");
    assert(!isMarblePositionFree({x:2,y:2}, geometry, []), "edge clearance");
    assert(!isMarblePositionFree({x:150,y:100}, geometry, [{x:150,y:100,radius:30}]), "object exclusion");
    const first = generateProceduralMarbles(geometry, [], 0);
    const second = generateProceduralMarbles(geometry, [], 0);
    assert(first.positions.length <= first.target, "target cap");
    assert(first.positions.every(point => isMarblePositionFree(point, geometry, [])), "containment");
    assert(first.positions.length === 0 || second.positions.length === 0 ||
        first.positions.some((point, index) => point.x !== second.positions[index]?.x || point.y !== second.positions[index]?.y), "randomization");
}
