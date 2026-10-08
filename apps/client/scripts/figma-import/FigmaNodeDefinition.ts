/** Raw Figma export types. Coordinates are NOT converted to game space in FI-1. */
export type FigmaNodeType = string;
export type FigmaAffineTransform = readonly [
    readonly [number, number, number],
    readonly [number, number, number],
];

export interface FigmaVector2 { readonly x: number; readonly y: number }
export interface FigmaBounds extends FigmaVector2 {
    readonly width: number;
    readonly height: number;
}

export interface FigmaNode extends Partial<FigmaBounds> {
    readonly id?: string;
    readonly name: string;
    readonly type: FigmaNodeType;
    readonly visible?: boolean;
    readonly rotation?: number;
    readonly relativeTransform?: FigmaAffineTransform;
    readonly absoluteTransform?: FigmaAffineTransform;
    readonly absoluteBoundingBox?: FigmaBounds;
    readonly children?: readonly FigmaNode[];
    readonly [property: string]: unknown;
}

export type FigmaExportDocument = FigmaNode | readonly FigmaNode[] | {
    readonly document: FigmaNode;
};

export type FigmaGameplayObjectKind =
    | "courseBoundary"
    | "wallOpening"
    | "ballSpawn"
    | "hole"
    | "metalBox"
    | "radialBumper"
    | "directionalBumper"
    | "rotatingPaddle"
    | "fan" | "waterSprinkler" | "proximityMine"
    | "fireRobot" | "waterRobot" | "windRobot"
    | "smallRock" | "boulder";

export interface FigmaObjectIdentity {
    readonly kind: FigmaGameplayObjectKind;
    readonly id: string;
    readonly index?: number;
    readonly direction?: "clockwise" | "anticlockwise";
}

export interface FigmaParsedObject {
    readonly identity: FigmaObjectIdentity;
    readonly name: string;
    readonly type: FigmaNodeType;
    readonly nodePath: readonly string[];
    /** Stable traversal index, including non-gameplay nodes. */
    readonly sourceOrder?: number;
    /** Index path from export root, independent of duplicate node names. */
    readonly sourceIndexPath?: readonly number[];
    /** Figma-provided node ID, if the exporter includes it. */
    readonly sourceId?: string;
    /** Original unsuffixed ID, for deterministic collision diagnostics. */
    readonly baseObjectId?: string;
    readonly bounds: FigmaBounds;
    readonly rotationDegrees?: number;
    readonly relativeTransform?: FigmaAffineTransform;
    readonly absoluteTransform?: FigmaAffineTransform;
    readonly absoluteBoundingBox?: FigmaBounds;
    /** Retained for future geometry extraction and metadata support. */
    readonly sourceNode: FigmaNode;
    /** Source x/y from the supported export is already root-frame-local. */
    readonly coordinateSpace?: "frameLocal";
}

export interface FigmaParseDiagnostic {
    readonly severity: "warning" | "error";
    readonly code: string;
    readonly path: readonly string[];
    readonly message: string;
}

export interface FigmaParseResult {
    readonly objects: readonly FigmaParsedObject[];
    readonly diagnostics: readonly FigmaParseDiagnostic[];
    readonly visitedNodeCount: number;
    readonly ignoredNodeCount: number;
}

/** FI-2 output contracts. Positions are frame-local Figma pixels. */
export type FigmaTransformStrategy = "center" | "topLeft" | "mechanicalPivot" | "customNormalized";
export interface FigmaAnchor { readonly x: number; readonly y: number }
export interface FigmaTransformProfile {
    readonly strategy: FigmaTransformStrategy;
    readonly anchor?: FigmaAnchor;
    readonly allowRotation: boolean;
    readonly allowMirroring: boolean;
    readonly sizing: "fixed" | "authored";
}
export interface FigmaResolvedTransform {
    readonly matrix: FigmaAffineTransform;
    readonly position: FigmaVector2;
    readonly rotationRadians: number;
    readonly mirrored: boolean;
    readonly determinant: number;
    readonly scaleX: number;
    readonly scaleY: number;
}
export interface FigmaConversionDiagnostic extends FigmaParseDiagnostic {}
export interface FigmaConvertedObject {
    readonly object: FigmaParsedObject;
    readonly transform: FigmaResolvedTransform;
    readonly diagnostics: readonly FigmaConversionDiagnostic[];
}
export interface FigmaGeometryResult {
    readonly course: {
        readonly type: "polygon";
        readonly width: number;
        readonly height: number;
        readonly baseSurface: "grass";
        readonly vertices: readonly FigmaVector2[];
        readonly openings: readonly { readonly edgeIndex: number; readonly start: number; readonly end: number }[];
    } | null;
    readonly diagnostics: readonly FigmaConversionDiagnostic[];
}

/** FI-5A cross-export metadata; intentionally does not modify FI-2 conversion contracts. */
export interface FigmaSvgObjectReference {
    readonly figmaObjectId: string;
    readonly sourceIndexPath?: readonly number[];
    readonly svgElementOrder: number;
    readonly svgElementId?: string;
    readonly mirrored: boolean;
    readonly transform: FigmaAffineTransform;
    readonly vertices: readonly FigmaVector2[];
    readonly bounds: FigmaBounds;
}

/** FI-5B: Optional resolved geometry attached to the converted object. */
export interface FigmaSvgResolvedPlacement {
    readonly geometrySource: 'svg';
    readonly mirrored: boolean;
    readonly matrix: FigmaAffineTransform;
    readonly worldPivot: FigmaVector2;
}
