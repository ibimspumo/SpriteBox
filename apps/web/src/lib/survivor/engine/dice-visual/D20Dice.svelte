<script lang="ts">
	/**
	 * D20 Dice Visual Component
	 *
	 * Animated D20 with predetermined results.
	 * Uses quaternion-only rotation for reliable face detection.
	 */
	import { onMount, onDestroy } from 'svelte';
	import { get } from 'svelte/store';
	import * as THREE from 'three';
	import { d20RollState, completeRoll, type D20RollState } from './store.js';
	import { secureRandomInt, secureRandomFloat } from '../core/random.js';

	// Props
	interface Props {
		size?: number;
		pixelScale?: number;
	}

	let { size = 200, pixelScale = 2 }: Props = $props();

	// DOM Reference
	let container: HTMLDivElement;

	// Three.js objects
	let scene: THREE.Scene;
	let camera: THREE.PerspectiveCamera;
	let renderer: THREE.WebGLRenderer;
	let diceGroup: THREE.Group;
	let animationFrameId: number;

	// Face data - maps face index to its normal vector
	interface FaceData {
		normal: THREE.Vector3;
		center: THREE.Vector3;
		faceIndex: number;
	}
	const faceDataList: FaceData[] = [];

	// Pre-calculated quaternions: value (1-20) -> quaternion that shows that value
	const valueToQuaternion: Map<number, THREE.Quaternion> = new Map();

	// Animation state
	type AnimationPhase = 'idle' | 'rolling' | 'pause' | 'zoom' | 'done';
	let phase = $state<AnimationPhase>('idle');
	let displayResult = $state<number | null>(null);
	let animationStartTime = 0;
	let targetResult = 0;
	let targetQuaternion = new THREE.Quaternion();

	// Animation timing (seconds)
	const ROLL_DURATION = 1.8; // Single fluid roll animation
	const PAUSE_DURATION = 0.25; // Brief pause before zoom
	const ZOOM_DURATION = 0.3;

	// Camera position
	const CAMERA_Z = 4;
	const ZOOM_CAMERA_Z = 3.2; // Closer for zoom effect

	/**
	 * Direction the winning face should point (toward camera = +Z)
	 */
	const FRONT_DIRECTION = new THREE.Vector3(0, 0, 1);

	// Create pixel-style number texture
	function createFaceTexture(num: number): THREE.CanvasTexture {
		const canvas = document.createElement('canvas');
		canvas.width = 64;
		canvas.height = 64;
		const ctx = canvas.getContext('2d')!;

		ctx.clearRect(0, 0, 64, 64);

		const isCrit = num === 20;
		const isFumble = num === 1;

		ctx.fillStyle = isCrit ? '#ffd700' : isFumble ? '#ff4444' : '#ffffff';
		ctx.font = 'bold 32px monospace';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';

		ctx.strokeStyle = '#000000';
		ctx.lineWidth = 4;
		ctx.strokeText(num.toString(), 32, 32);
		ctx.fillText(num.toString(), 32, 32);

		const texture = new THREE.CanvasTexture(canvas);
		texture.magFilter = THREE.NearestFilter;
		texture.minFilter = THREE.NearestFilter;
		return texture;
	}

	// Create gradient map for toon shading
	function createGradientMap(): THREE.DataTexture {
		const colors = new Uint8Array([40, 100, 180, 255]);
		const gradientMap = new THREE.DataTexture(colors, 4, 1, THREE.RedFormat);
		gradientMap.needsUpdate = true;
		return gradientMap;
	}

	/**
	 * Get which face value (1-20) is currently pointing toward camera.
	 * This checks the ACTUAL visual state, not the intended state.
	 */
	function getCurrentFrontFaceValue(): number {
		if (!diceGroup) return 1;

		let bestValue = 1;
		let bestDot = -Infinity;

		for (let i = 0; i < faceDataList.length; i++) {
			const faceData = faceDataList[i];
			// Transform the original normal by the current dice rotation
			const worldNormal = faceData.normal.clone().applyQuaternion(diceGroup.quaternion);
			const dot = worldNormal.dot(FRONT_DIRECTION);

			if (dot > bestDot) {
				bestDot = dot;
				// The value on this face is faceIndex + 1
				bestValue = faceData.faceIndex + 1;
			}
		}

		return bestValue;
	}

	/**
	 * Calculate quaternion that rotates the dice so that a specific face points toward camera.
	 */
	function calculateQuaternionForFace(faceIndex: number): THREE.Quaternion {
		const faceData = faceDataList[faceIndex];
		if (!faceData) {
			console.error(`No face data for index ${faceIndex}`);
			return new THREE.Quaternion();
		}

		// We need to find quaternion Q such that: Q * normal = FRONT_DIRECTION
		// setFromUnitVectors(a, b) returns Q where Q * a = b
		const q = new THREE.Quaternion();
		q.setFromUnitVectors(faceData.normal, FRONT_DIRECTION);

		return q;
	}

	/**
	 * Build the mapping from dice values (1-20) to quaternions.
	 * This is computed once at initialization.
	 */
	function buildValueToQuaternionMap(): void {
		valueToQuaternion.clear();

		console.log('D20: Building quaternion map...');

		for (let faceIndex = 0; faceIndex < 20; faceIndex++) {
			const value = faceIndex + 1; // Face 0 has value 1, Face 1 has value 2, etc.
			const quaternion = calculateQuaternionForFace(faceIndex);

			// Verify: after applying this quaternion, what value do we see?
			// We need to simulate this without actually rotating the dice
			const faceData = faceDataList[faceIndex];
			const transformedNormal = faceData.normal.clone().applyQuaternion(quaternion);
			const dotWithFront = transformedNormal.dot(FRONT_DIRECTION);

			if (dotWithFront < 0.99) {
				console.warn(`D20: Quaternion for value ${value} might be incorrect. Dot: ${dotWithFront}`);
			}

			valueToQuaternion.set(value, quaternion);
		}

		// Verify all mappings
		let allCorrect = true;
		for (let value = 1; value <= 20; value++) {
			const quat = valueToQuaternion.get(value);
			if (!quat) {
				console.error(`D20: No quaternion for value ${value}`);
				allCorrect = false;
				continue;
			}

			// Check which face would be visible with this quaternion
			let bestMatchValue = 1;
			let bestDot = -Infinity;
			for (const faceData of faceDataList) {
				const transformedNormal = faceData.normal.clone().applyQuaternion(quat);
				const dot = transformedNormal.dot(FRONT_DIRECTION);
				if (dot > bestDot) {
					bestDot = dot;
					bestMatchValue = faceData.faceIndex + 1;
				}
			}

			if (bestMatchValue !== value) {
				console.error(`D20: Value ${value} quaternion shows ${bestMatchValue} instead!`);
				allCorrect = false;
			}
		}

		if (allCorrect) {
			console.log('D20: All 20 quaternions verified correct!');
		}
	}

	/**
	 * Get quaternion for a specific dice value with optional random Z-rotation.
	 */
	function getQuaternionForValue(value: number, addRandomRotation = true): THREE.Quaternion {
		const baseQuat = valueToQuaternion.get(value);
		if (!baseQuat) {
			console.error(`D20: No quaternion for value ${value}`);
			return new THREE.Quaternion();
		}

		const result = baseQuat.clone();

		if (addRandomRotation) {
			// Add rotation around Z axis (camera axis) - this keeps the face visible
			// but rotates how the number appears (like rotating a clock)
			const randomAngle = secureRandomFloat() * Math.PI * 2;
			const zRotation = new THREE.Quaternion();
			zRotation.setFromAxisAngle(FRONT_DIRECTION, randomAngle);
			result.premultiply(zRotation);
		}

		return result;
	}

	// Create the D20 mesh with numbers on faces
	function createD20(): THREE.Group {
		const group = new THREE.Group();

		const geometry = new THREE.IcosahedronGeometry(1, 0);
		const material = new THREE.MeshToonMaterial({
			color: 0xcc2222,
			gradientMap: createGradientMap(),
		});

		const mesh = new THREE.Mesh(geometry, material);
		group.add(mesh);

		// Outline
		const outlineGeometry = geometry.clone();
		const outlineMaterial = new THREE.MeshBasicMaterial({
			color: 0x000000,
			side: THREE.BackSide,
		});
		const outline = new THREE.Mesh(outlineGeometry, outlineMaterial);
		outline.scale.setScalar(1.05);
		group.add(outline);

		// Calculate face data and add number decals
		calculateFaceDataAndAddDecals(geometry, group);

		// Build quaternion map after face data is ready
		buildValueToQuaternionMap();

		return group;
	}

	/**
	 * Extract face normals from geometry and add number decals.
	 */
	function calculateFaceDataAndAddDecals(geometry: THREE.IcosahedronGeometry, group: THREE.Group): void {
		const positions = geometry.attributes.position;

		faceDataList.length = 0;

		// Icosahedron has 20 triangular faces, 3 vertices each = 60 vertices total
		for (let faceIndex = 0; faceIndex < 20; faceIndex++) {
			const i = faceIndex * 3;

			const v0 = new THREE.Vector3().fromBufferAttribute(positions, i);
			const v1 = new THREE.Vector3().fromBufferAttribute(positions, i + 1);
			const v2 = new THREE.Vector3().fromBufferAttribute(positions, i + 2);

			// Face center
			const center = new THREE.Vector3().add(v0).add(v1).add(v2).divideScalar(3);

			// Face normal (cross product of edges)
			const edge1 = new THREE.Vector3().subVectors(v1, v0);
			const edge2 = new THREE.Vector3().subVectors(v2, v0);
			const normal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();

			// Store face data
			faceDataList.push({
				normal: normal.clone(),
				center: center.clone(),
				faceIndex,
			});

			// Create number decal for this face
			const diceValue = faceIndex + 1; // Face 0 = 1, Face 1 = 2, etc.
			const decalGeometry = new THREE.PlaneGeometry(0.4, 0.4);
			const texture = createFaceTexture(diceValue);
			const decalMaterial = new THREE.MeshBasicMaterial({
				map: texture,
				transparent: true,
				depthTest: true,
				depthWrite: false,
				side: THREE.DoubleSide,
				polygonOffset: true,
				polygonOffsetFactor: -1,
			});

			const decal = new THREE.Mesh(decalGeometry, decalMaterial);

			// Position decal slightly above face surface
			const offset = normal.clone().multiplyScalar(0.01);
			decal.position.copy(center).add(offset);

			// Orient decal to face outward (perpendicular to face)
			const decalQuat = new THREE.Quaternion();
			decalQuat.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
			decal.quaternion.copy(decalQuat);

			// Rotate text to be readable (align with "up" direction)
			const worldUp = new THREE.Vector3(0, 1, 0);
			const tangent = new THREE.Vector3().crossVectors(worldUp, normal);
			if (tangent.lengthSq() < 0.001) {
				tangent.crossVectors(new THREE.Vector3(1, 0, 0), normal);
			}
			tangent.normalize();

			const localX = new THREE.Vector3(1, 0, 0).applyQuaternion(decalQuat);
			const angle = Math.atan2(
				tangent.dot(new THREE.Vector3().crossVectors(localX, normal)),
				tangent.dot(localX)
			);
			const rotationQuat = new THREE.Quaternion().setFromAxisAngle(normal, angle);
			decal.quaternion.premultiply(rotationQuat);

			group.add(decal);
		}
	}

	// Initialize scene
	function initScene(): void {
		if (!container) return;

		scene = new THREE.Scene();

		camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
		camera.position.set(0, 0, CAMERA_Z);
		camera.lookAt(0, 0, 0);

		const renderWidth = Math.floor(size / pixelScale);
		const renderHeight = Math.floor(size / pixelScale);

		renderer = new THREE.WebGLRenderer({
			antialias: false,
			alpha: true,
		});
		renderer.setSize(renderWidth, renderHeight);
		renderer.domElement.style.width = `${size}px`;
		renderer.domElement.style.height = `${size}px`;
		renderer.domElement.style.imageRendering = 'pixelated';
		container.appendChild(renderer.domElement);

		// Lighting
		const ambient = new THREE.AmbientLight(0xffffff, 0.5);
		scene.add(ambient);

		const mainLight = new THREE.DirectionalLight(0xffffff, 1);
		mainLight.position.set(3, 4, 5);
		scene.add(mainLight);

		const fillLight = new THREE.DirectionalLight(0x8888ff, 0.3);
		fillLight.position.set(-3, -2, -3);
		scene.add(fillLight);

		// Create dice
		diceGroup = createD20();
		scene.add(diceGroup);

		// Start animation loop
		animate();
	}

	// Easing function for zoom
	function easeOutQuad(t: number): number {
		return 1 - (1 - t) * (1 - t);
	}

	// Animation loop
	function animate(): void {
		animationFrameId = requestAnimationFrame(animate);

		const now = Date.now();
		const elapsed = (now - animationStartTime) / 1000;

		switch (phase) {
			case 'idle': {
				// Gentle continuous rotation using quaternion multiplication
				const idleRotation = new THREE.Quaternion();
				idleRotation.setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.005);
				diceGroup.quaternion.multiply(idleRotation);
				break;
			}

			case 'rolling': {
				if (elapsed < ROLL_DURATION) {
					const progress = elapsed / ROLL_DURATION;

					// Single fluid animation with 3 blended phases:
					// 0-40%: Fast tumbling
					// 40-80%: Slowing down + blending toward target
					// 80-100%: Final approach to target

					// Tumbling speed: fast at start, zero at end
					const tumbleStrength = Math.pow(1 - progress, 2.5) * 0.18;

					if (tumbleStrength > 0.001) {
						const spinX = new THREE.Quaternion().setFromAxisAngle(
							new THREE.Vector3(1, 0, 0),
							tumbleStrength * 1.3
						);
						const spinY = new THREE.Quaternion().setFromAxisAngle(
							new THREE.Vector3(0, 1, 0),
							tumbleStrength * 1.7
						);
						const spinZ = new THREE.Quaternion().setFromAxisAngle(
							new THREE.Vector3(0, 0, 1),
							tumbleStrength * 0.9
						);
						diceGroup.quaternion.multiply(spinX).multiply(spinY).multiply(spinZ);
					}

					// Blend toward target: starts at 30%, increases smoothly
					if (progress > 0.3) {
						const blendProgress = (progress - 0.3) / 0.7; // 0 to 1 over remaining 70%
						// Use smooth step for natural feel
						const blendStrength = blendProgress * blendProgress * (3 - 2 * blendProgress);
						// Increasing slerp factor as we approach the end
						const slerpFactor = blendStrength * 0.08;
						diceGroup.quaternion.slerp(targetQuaternion, slerpFactor);
					}

					// Bounce effect: decreases over time
					const bounceIntensity = Math.pow(1 - progress, 1.5) * 0.15;
					const bounce = Math.sin(progress * Math.PI * 4) * bounceIntensity;
					diceGroup.position.y = bounce;
				} else {
					// Snap to exact target position
					diceGroup.quaternion.copy(targetQuaternion);
					diceGroup.position.y = 0;

					// Brief pause before zoom
					phase = 'pause';
					animationStartTime = now;
				}
				break;
			}

			case 'pause': {
				// Brief moment of stillness to let the result sink in
				if (elapsed >= PAUSE_DURATION) {
					phase = 'zoom';
					animationStartTime = now;
				}
				break;
			}

			case 'zoom': {
				if (elapsed < ZOOM_DURATION) {
					// Zoom camera closer
					const progress = easeOutQuad(elapsed / ZOOM_DURATION);
					camera.position.z = CAMERA_Z - (CAMERA_Z - ZOOM_CAMERA_Z) * progress;
				} else {
					// Done!
					camera.position.z = ZOOM_CAMERA_Z;
					phase = 'done';

					// Verify the visual result matches expected
					const visualResult = getCurrentFrontFaceValue();
					if (visualResult !== targetResult) {
						console.error(`D20 MISMATCH: Expected ${targetResult}, visually showing ${visualResult}`);
					} else {
						console.log(`D20: Correctly showing ${targetResult}`);
					}

					displayResult = targetResult;
					completeRoll(targetResult);
				}
				break;
			}

			case 'done': {
				// Static - dice stays in place showing the result
				// No rotation, no movement
				break;
			}
		}

		renderer.render(scene, camera);
	}

	// Track if scene is initialized
	let sceneInitialized = false;
	// Store pending roll if triggered before scene init
	let pendingRoll = false;

	// Start a roll with a predetermined result
	function startRoll(result: number): void {
		// Guard: Don't start if scene not ready
		if (!sceneInitialized || !camera || !diceGroup) {
			console.warn('D20: Scene not ready, queueing roll');
			pendingRoll = true;
			return;
		}

		targetResult = result;
		targetQuaternion = getQuaternionForValue(result, false); // No random rotation for clarity

		// Reset camera position
		camera.position.z = CAMERA_Z;

		displayResult = null;
		animationStartTime = Date.now();
		phase = 'rolling';
		pendingRoll = false;

		console.log(`D20: Rolling for ${result}...`);
	}

	// Subscribe to store
	const unsubscribe = d20RollState.subscribe((state: D20RollState) => {
		if (state.isRolling && phase !== 'rolling' && phase !== 'pause' && phase !== 'zoom') {
			// Generate random result (1-20) using secure randomness
			const randomResult = secureRandomInt(1, 20);
			startRoll(randomResult);
		}
		if (!state.isRolling && state.result !== null && phase === 'done') {
			displayResult = state.result;
		}
	});

	onMount(() => {
		initScene();
		sceneInitialized = true;

		// Check if a roll was requested before scene was ready
		if (pendingRoll) {
			const state = get(d20RollState);
			if (state.isRolling) {
				const randomResult = secureRandomInt(1, 20);
				startRoll(randomResult);
			}
		}
	});

	onDestroy(() => {
		unsubscribe();
		if (animationFrameId) cancelAnimationFrame(animationFrameId);
		if (renderer) {
			renderer.dispose();
			renderer.domElement.remove();
		}
	});
</script>

<div class="d20-container" bind:this={container} style:--size="{size}px">
	{#if displayResult !== null && phase === 'done'}
		<div class="result" class:crit={displayResult === 20} class:fumble={displayResult === 1}>
			{displayResult}
		</div>
	{/if}
</div>

<style>
	.d20-container {
		position: relative;
		width: var(--size);
		height: var(--size);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.d20-container :global(canvas) {
		image-rendering: pixelated;
		image-rendering: crisp-edges;
	}

	.result {
		position: absolute;
		bottom: var(--space-1);
		left: 50%;
		transform: translateX(-50%);
		font-size: var(--font-size-2xl);
		font-weight: bold;
		font-family: var(--font-family-mono);
		color: var(--color-text-primary);
		text-shadow: 2px 2px 0 var(--color-bg-primary), -1px -1px 0 var(--color-bg-primary);
		animation: result-pop 0.3s ease-out;
	}

	.result.crit {
		color: var(--color-warning);
		text-shadow: 0 0 8px var(--color-warning), 2px 2px 0 var(--color-bg-primary);
		animation: crit-pop 0.5s ease-out;
	}

	.result.fumble {
		color: var(--color-error);
	}
</style>
