# Issue 40: hero click and press comparison

## Try the hold preview

Open the local preview homepage with `?heroDemo=1`, such as `http://localhost:8000/?heroDemo=1`. The selector starts at Off. Choose one of these three modes, then press and hold an open part of the particle field. Release to see the brief tail.

- **Hold: pull inward** draws nearby particles toward the press point. On release, they move outward briefly.
- **Hold: push outward** moves nearby particles away from the press point while it is held. Its outward push fades after release.
- **Hold: orbit** moves nearby particles around the press point. The orbit continues briefly after release.

The hold modes suspend pointer repulsion while the press and release tail are active. Pointer tracking, parallax, drift, and meteors continue. Ordinary hover returns on the first frame after the tail ends. With Off selected, or without the query parameter, the usual hover behavior remains. The selector and all three modes are still a preview; this report does not recommend putting them on the permanent page yet.

## Earlier click-mode test conditions and limits

I built this worktree and served its `dist/` on localhost with `?heroDemo=1`. Playwright Chromium used software WebGL. I tested a 1440 × 900 desktop viewport and an emulated 390 × 844 touch viewport at device pixel ratio 2. The real homepage, particle canvas, text, buttons, selector, pointer handling, and meteors were present in both. Each row used the same browser setup, viewport, click point (72% across and 45% down the hero), 200 ms image delay, and 650 ms `requestAnimationFrame` sample. Modes ran in selector order on a continuously moving field, so particle positions and meteor timing were not identical. These short samples compare this machine only; they are not hardware GPU or physical phone benchmarks.

Evidence is in `/home/andy/.local/share/agent-toolkit/team-runs/blog-hero40-codex-20261001/tmp/compare-evidence/`: `desktop-<mode>-200.png`, `phone-<mode>-200.png`, the two `*-sheet.png` contact sheets, `measurements.json`, and `edges.json`. The repeat and hold images use `*-repeat.png`, `*-gather-hold.png`, and `*-gather-release.png`. Chromium reported no page errors. The selector's active label matched all nine selected values. The visual judgments below come from these rendered images; they do not claim a measured particle displacement.

| Mode | Desktop visual result at 200 ms; mean / p95 frame interval | Emulated phone visual result at 200 ms; mean / p95 | Response, fit, and decision |
| --- | --- | --- | --- |
| Off | Calm field; 52.6 / 66.7 ms. | Calm field; 25.6 / 49.9 ms. | Baseline. No click state or extra per-particle force. **Provisional choice.** |
| Shockwave | No clearly legible expanding ring in the still; 52.6 / 66.7 ms. | Also indistinct behind the text; 22.6 / 33.4 ms. | A moving ring made from existing particles fits the visual language, but the tested response is too hard to perceive. Reject this tuning. |
| Gravity well: short implosion | Some local clustering is more apparent than in the other stills; 59.1 / 83.3 ms. | The strongest apparent local concentration; 24.1 / 33.4 ms. | Most promising force shape, yet it reads as an incidental change in the sparse field. Keep only as a candidate for a more controlled follow-up. |
| Gravity well: slow pull | Gradual change is hard to locate; 56.9 / 83.3 ms. | The pull blends into ordinary drift; 22.2 / 33.4 ms. | Reject: duration adds little clear feedback. |
| Vortex: alternating | No clear orbit at this scale; 54.2 / 66.7 ms. | Orbit also hard to distinguish; 30.3 / 33.4 ms. | Reject: spin sequence and moving wells add state without a clear visual gain. |
| Vortex: position | No clear orbit; 63.3 / 66.7 ms. | No clear orbit; 23.8 / 33.4 ms. | Reject: the left/right spin rule is invisible to an ordinary visitor and adds behavior to explain. |
| Particle scatter | Brief change is easy to miss by 200 ms; 50.0 / 66.7 ms. | Brief change is easy to miss; 24.0 / 33.4 ms. | Simplest effect code, but reject this tuning because its 160 ms event has almost ended by the first still. |
| Press → gather → release | Tap is weak; held image has no unmistakable cluster; 51.3 / 66.8 ms. | Tap and simulated 850 ms touch hold remain subtle; 27.1 / 33.4 ms. | Reject: the extra hold/release/cancel state and duration do not earn a clear result. |
| Local turbulence | No clear local disturbance; 52.8 / 66.7 ms. | No clear local disturbance; 23.2 / 33.5 ms. | Reject: unpredictable movement is harder to read as a response to a precise tap. |

## Shared behavior and cost

- Every active mode accepted five rapid repeat clicks or taps and taps 5 px from the left, right, and top hero edges without a page error. The images show no obvious boundary artifact. The test did not measure whether every rapid event stayed visible. Input stores at most three events; later taps replace older ones.
- Desktop pointer movement updated hero parallax (`--px: 0.200`, `--py: -0.050`) during the earlier hold test. Coarse pointer emulation kept those properties unset, as designed. That test ran pointer and click forces in the same particle step, so its images cannot show each force's separate effect. The new hold preview suspends pointer repulsion during its hold and tail.
- Meteor trails were visible in the ordinary hero renders while click modes were available. The simulation applies meteor repulsion and click forces in the same particle step. A click timed to cross a meteor was not captured, so visual interaction between them remains unverified.
- The phone viewport was emulated. No physical accelerometer was available, so snow-globe motion and its interaction with a click remain untested. A real phone is needed before adopting any mode.
- Reduced motion, emulated data saver, and forced WebGL2 failure each left the CSS hero visible and disabled the demo selector with “Particle field unavailable on this device.” This happened on both viewport sizes. The fallback leaves the canvas element in the DOM but does not start the field.
- The normal desktop path selects the 1,600-particle tier; the small-screen path uses density-based count and pixel ratio capped at 2. The short software-rendered frame samples range from 50.0 to 63.3 ms mean on desktop and 22.2 to 30.3 ms on phone. They show no reliable mode ranking. The 750-particle weak-laptop tier and real GPU frame cost were not measured.
- All modes use existing particle positions rather than a separate graphic. Scatter has the least effect code and one short event. Gravity adds two tunings. Shockwave needs a timed radial front. Gather needs held pointer state plus release and cancel phases. Vortex has the highest cost: spin, evolving well positions, interaction between up to three wells, and an extra force calculation for each particle. The prototype's shared click input, dispatch, and effect files total 712 lines; keeping the whole menu would be disproportionate to the observed benefit.

## Earlier recommendation and follow-up

Keep the permanent hero **Off** for now. The earlier click-mode images did not show a clear improvement at both tested sizes. The software renderer also leaves real-device performance open. The new hold modes need their own visual and device checks before any permanent choice.

The earlier follow-up called for a short gravity-well test against Off on a physical touch phone and a hardware-accelerated desktop. For the current hold preview, record video and frame times on those devices too. Check a meteor crossing, pointer movement, short and long holds, edge presses, device motion, reduced motion, data saver, and the weak-laptop tier. Use the observations to decide whether any mode is clear enough to keep.
