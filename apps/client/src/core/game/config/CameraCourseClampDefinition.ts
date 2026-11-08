/** Camera-only course-relative overscan. These fractions describe how much
 * of the visible world-space viewport may extend beyond each course edge.
 * Physics and object OOB systems continue using technical bounds. */
export interface CameraCourseClampDefinition {
    readonly horizontalOverscanFraction: number;
    readonly verticalOverscanFraction: number;
}

export const DEFAULT_CAMERA_COURSE_CLAMP_DEFINITION: CameraCourseClampDefinition = {
    horizontalOverscanFraction: 0.5,
    verticalOverscanFraction: 0.5,
};
