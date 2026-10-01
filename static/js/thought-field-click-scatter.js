// Scatter: a click gives the particles near it a short outward impulse.
// Every particle in the radius responds in the same frame, with no
// travelling front. The push fades linearly to zero over SCATTER_LIFE
// after release. The drift in stepParticles then pulls them home.

/** @typedef {import("./thought-field-clicks.js").ForceOptions} ForceOptions */

export const SCATTER_RADIUS = 0.3;
// Seconds after release until the push has gone.
export const SCATTER_LIFE = 0.3;
// Field units per second at the press point at full strength.
const SCATTER_SPEED = 1.4;

/**
 * Pushes each particle within SCATTER_RADIUS of the click away from it,
 * strongest at the centre and zero at the edge, scaled by the click's
 * strength and by the fade since release. A particle exactly on the
 * press point has no direction and stays.
 * @param {ForceOptions} options
 */
export function scatter(options) {
	const { field, click, dt } = options;
	const { pos, count } = field;
	const radius2 = SCATTER_RADIUS * SCATTER_RADIUS;
	const since = click.age - Math.max(click.released, 0);
	const fade = Math.max(0, 1 - since / SCATTER_LIFE);
	const push = SCATTER_SPEED * click.strength * fade * dt;
	for (let i = 0; i < count; i += 1) {
		const ix = i * 3;
		const dx = pos[ix] - click.x;
		const dy = pos[ix + 1] - click.y;
		const d2 = dx * dx + dy * dy;
		if (d2 < radius2 && d2 > 0.000001) {
			const falloff = 1 - d2 / radius2;
			const scale = (falloff * falloff * push) / Math.sqrt(d2);
			pos[ix] += dx * scale;
			pos[ix + 1] += dy * scale;
		}
	}
}
