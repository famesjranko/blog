export const FIELD_VERTEX_SHADER = `
attribute vec3 aColor;
attribute float aScale;
uniform float uSize;
uniform float uPixelRatio;
varying vec3 vColor;
void main() {
	vColor = aColor;
	vec4 mv = modelViewMatrix * vec4(position, 1.0);
	gl_PointSize = uSize * aScale * uPixelRatio;
	gl_Position = projectionMatrix * mv;
}
`;

export const FIELD_FRAGMENT_SHADER = `
varying vec3 vColor;
uniform float uGlow;
uniform float uAlpha;
void main() {
	float d = length(gl_PointCoord - vec2(0.5));
	if (d > 0.5) {
		discard;
	}
	float core = smoothstep(0.5, 0.0, d);
	vec3 col = vColor * (0.55 + 0.85 * smoothstep(0.5, 0.18, d)) * uGlow;
	gl_FragColor = vec4(col, core * core * uAlpha);
}
`;

export const METEOR_VERTEX_SHADER = `
attribute vec3 aColor;
attribute float aScale;
attribute float aAlpha;
uniform float uSize;
uniform float uPixelRatio;
varying vec3 vColor;
varying float vAlpha;
void main() {
	vColor = aColor;
	vAlpha = aAlpha;
	vec4 mv = modelViewMatrix * vec4(position, 1.0);
	gl_PointSize = uSize * aScale * uPixelRatio;
	gl_Position = projectionMatrix * mv;
}
`;

export const METEOR_FRAGMENT_SHADER = `
varying vec3 vColor;
varying float vAlpha;
uniform float uGlow;
uniform float uAlpha;
void main() {
	float d = length(gl_PointCoord - vec2(0.5));
	if (d > 0.5) {
		discard;
	}
	float core = smoothstep(0.5, 0.0, d);
	vec3 col = vColor * (0.55 + 0.85 * smoothstep(0.5, 0.18, d)) * uGlow;
	gl_FragColor = vec4(col, core * core * uAlpha * vAlpha);
}
`;
