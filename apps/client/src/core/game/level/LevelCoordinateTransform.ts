/**
 * Authoritative conversion between level-local coordinates and runtime world coordinates.
 *
 * Level-local coordinate convention:
 * - Origin (0, 0) is the top-left of the playable course.
 * - +X points right.
 * - +Y points down.
 * - 1 level pixel equals 1 runtime world pixel.
 *
 * This module deliberately does not know about World, rendering, physics, or any
 * particular level. The caller supplies the runtime world-space origin of the
 * playable course.
 */

export interface LevelPosition {
  readonly x: number;
  readonly y: number;
}

export interface WorldPosition {
  readonly x: number;
  readonly y: number;
}

/**
 * Runtime world-space position corresponding to level-local (0, 0).
 */
export interface LevelWorldOrigin {
  readonly x: number;
  readonly y: number;
}

export function levelToWorldX(levelX: number, origin: LevelWorldOrigin): number {
  return origin.x + levelX;
}

export function levelToWorldY(levelY: number, origin: LevelWorldOrigin): number {
  return origin.y + levelY;
}

export function worldToLevelX(worldX: number, origin: LevelWorldOrigin): number {
  return worldX - origin.x;
}

export function worldToLevelY(worldY: number, origin: LevelWorldOrigin): number {
  return worldY - origin.y;
}

export function levelToWorldPosition(
  position: LevelPosition,
  origin: LevelWorldOrigin,
): WorldPosition {
  return {
    x: levelToWorldX(position.x, origin),
    y: levelToWorldY(position.y, origin),
  };
}

export function worldToLevelPosition(
  position: WorldPosition,
  origin: LevelWorldOrigin,
): LevelPosition {
  return {
    x: worldToLevelX(position.x, origin),
    y: worldToLevelY(position.y, origin),
  };
}
