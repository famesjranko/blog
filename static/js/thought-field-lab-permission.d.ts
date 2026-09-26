// Hand-written types for thought-field-lab-permission.js so the Node
// test suite can import the browser module without switching the
// compiler to check JavaScript. Keep in step with the JSDoc in the .js
// file: the static typecheck resolves sibling imports to this file too.

export type PermissionResult = "granted" | "denied";
export type RequestPermission = () => Promise<PermissionResult>;

export interface PillInputs {
	supported: boolean;
	canRequest: boolean;
	sawReading: boolean;
	elapsedMs: number;
}

export interface PillState {
	forced: boolean;
	dismissed: boolean;
	message: string | null;
}

export const PILL_DELAY_MS: number;
export function shouldShowPill(inputs: PillInputs): boolean;
export function pillVisible(pill: PillState, inputs: PillInputs): boolean;
export function motionRequester(ctor: unknown): RequestPermission | null;
export function pillMessage(outcome: string): string | null;
