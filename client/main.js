import * as THREE from 'three';

// --- Main Setup ---
const infoElement = document.getElementById('info');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
camera.position.z = 4;

// --- Lighting ---
scene.add(new THREE.AmbientLight(0x707070));
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 5, 10);
scene.add(directionalLight);

// --- Global State ---
let particles, imagePlanes = [], selectedPlane = null;
let morphProgress = 0.0;
let handState = { isClosed: true, isPinching: false };
let targetHandState = { isClosed: true, isPinching: false };

// --- Particle System Setup ---
const PARTICLE_COUNT = 30000;
const particleGeometry = new THREE.BufferGeometry();

function setupParticleSystem() {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const saberPositions = new Float32Array(PARTICLE_COUNT * 3);
    const spherePositions = new Float32Array(PARTICLE_COUNT * 3);
    const saberColors = new Float32Array(PARTICLE_COUNT * 3);
    const sphereColors = new Float32Array(PARTICLE_COUNT * 3);
    const color = new THREE.Color();

    const BLADE_PARTICLE_COUNT = Math.floor(PARTICLE_COUNT * 0.75);
    const HILT_MAIN_PARTICLE_COUNT = Math.floor(PARTICLE_COUNT * 0.15);
    const voxelSize = 0.04;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const i3 = i * 3;

        // --- Lightsaber Shape ---
        if (i < BLADE_PARTICLE_COUNT) {
            const bladeHeight = 3.0, baseRadius = 0.09;
            const tipStartHeight = bladeHeight * 0.85;
            const y = Math.random() * bladeHeight;
            let scaleFactor = 1.0;
            if (y > tipStartHeight) {
                const t = (y - tipStartHeight) / (bladeHeight - tipStartHeight);
                scaleFactor = 1.0 - t * t;
            }
            const currentRadius = baseRadius * scaleFactor;
            const r = Math.random() * currentRadius;
            const angle = Math.random() * Math.PI * 2;
            let x = Math.cos(angle) * r, z = Math.sin(angle) * r;
            saberPositions[i3] = Math.round(x / voxelSize) * voxelSize;
            saberPositions[i3 + 1] = Math.round(y / voxelSize) * voxelSize - 1.0;
            saberPositions[i3 + 2] = Math.round(z / voxelSize) * voxelSize;
            color.setHex(r < currentRadius * 0.5 ? 0xffffff : 0xffd700);
            saberColors.set([color.r, color.g, color.b], i3);
        } else if (i < BLADE_PARTICLE_COUNT + HILT_MAIN_PARTICLE_COUNT) {
            const hiltHeight = 0.8, hiltRadius = 0.13;
            const r = Math.random() * hiltRadius, angle = Math.random() * Math.PI * 2;
            let x = Math.cos(angle) * r, y = Math.random() * -hiltHeight - 1.0, z = Math.sin(angle) * r;
            saberPositions[i3] = Math.round(x / voxelSize) * voxelSize;
            saberPositions[i3 + 1] = Math.round(y / voxelSize) * voxelSize;
            saberPositions[i3 + 2] = Math.round(z / voxelSize) * voxelSize;
            const grey = 0.2 + Math.random() * 0.1;
            color.setRGB(grey, grey, grey);
            saberColors.set([color.r, color.g, color.b], i3);
        } else {
            const crossguardLength = 0.7, crossguardRadius = 0.07;
            const r = Math.random() * crossguardRadius, angle = Math.random() * Math.PI * 2;
            let x = (Math.random() - 0.5) * crossguardLength, y = Math.cos(angle) * r - 1.0, z = Math.sin(angle) * r;
            saberPositions[i3] = Math.round(x / voxelSize) * voxelSize;
            saberPositions[i3 + 1] = Math.round(y / voxelSize) * voxelSize;
            saberPositions[i3 + 2] = Math.round(z / voxelSize) * voxelSize;
            const grey = 0.25 + Math.random() * 0.1;
            color.setRGB(grey, grey, grey);
            saberColors.set([color.r, color.g, color.b], i3);
        }

        // --- Noisy Sphere Shape ---
        const sphereBaseRadius = 1.5;
        const noiseFactor = 0.4; // How 'fuzzy' the sphere edge is
        const theta = Math.random() * 2 * Math.PI;
        const phi = Math.acos(2 * Math.random() - 1.0);
        const randomRadius = sphereBaseRadius + (Math.random() - 0.5) * noiseFactor;
        spherePositions[i3] = randomRadius * Math.sin(phi) * Math.cos(theta);
        spherePositions[i3 + 1] = randomRadius * Math.sin(phi) * Math.sin(theta);
        spherePositions[i3 + 2] = randomRadius * Math.cos(phi);
        color.setHex(Math.random() < 0.7 ? 0xaaaaff : 0xffffdd);
        sphereColors.set([color.r, color.g, color.b], i3);
    }

    positions.set(saberPositions);
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(saberColors, 3));
    particleGeometry.setAttribute('saberPosition', new THREE.BufferAttribute(saberPositions, 3));
    particleGeometry.setAttribute('spherePosition', new THREE.BufferAttribute(spherePositions, 3));
    particleGeometry.setAttribute('saberColor', new THREE.BufferAttribute(saberColors, 3));
    particleGeometry.setAttribute('sphereColor', new THREE.BufferAttribute(sphereColors, 3));

    const material = new THREE.PointsMaterial({ size: 0.03, vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, opacity: 0.9 });
    particles = new THREE.Points(particleGeometry, material);
    scene.add(particles);
}

// --- Image Plane System ---
function setupImagePlanes() {
    const imageElements = document.querySelectorAll('.galaxy-image');
    const loader = new THREE.TextureLoader();
    imageElements.forEach(img => {
        if (!img || !img.src) return;
        const texture = loader.load(img.src, () => {
            const aspect = img.naturalWidth / img.naturalHeight || 1;
            const baseSize = 0.15; // Drastically reduced image size
            const geometry = new THREE.PlaneGeometry(aspect * baseSize, baseSize);
            const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0, depthWrite: false });
            const plane = new THREE.Mesh(geometry, material);
            plane.visible = false;
            imagePlanes.push(plane);
            scene.add(plane);
        });
    });
}

// --- Gesture Detection ---
function processHandData(handLandmarks) {
    if (!handLandmarks) {
        targetHandState = { isClosed: true, isPinching: false };
        return;
    }
    let fingerTipDist = 0;
    [8, 12, 16, 20].forEach(tipIndex => fingerTipDist += Math.hypot(handLandmarks[tipIndex].x - handLandmarks[9].x, handLandmarks[tipIndex].y - handLandmarks[9].y));
    targetHandState.isClosed = (fingerTipDist / 4) < 0.2;
    const pinchDist = Math.hypot(handLandmarks[4].x - handLandmarks[8].x, handLandmarks[4].y - handLandmarks[8].y);
    targetHandState.isPinching = pinchDist < 0.05;
}

// --- WebSocket Connection ---
const ws = new WebSocket('ws://localhost:8765');
ws.onopen = () => infoElement.textContent = "Connected. Show your hand.";
ws.onmessage = (event) => {
    infoElement.style.display = 'none';
    processHandData(JSON.parse(event.data)[0]);
};
ws.onclose = () => infoElement.textContent = 'Disconnected.';

// --- Animation Loop ---
const clock = new THREE.Clock();
const tiltedAxis = new THREE.Vector3(0.3, 1, 0).normalize();

function animate() {
    requestAnimationFrame(animate);
    const deltaTime = clock.getDelta(), elapsedTime = clock.getElapsedTime();

    handState.isClosed += (targetHandState.isClosed - handState.isClosed) * 0.1;
    handState.isPinching += (targetHandState.isPinching - handState.isPinching) * 0.1;

    const targetMorph = handState.isClosed > 0.5 ? 0.0 : 1.0;
    morphProgress += (targetMorph - morphProgress) * 3.0 * deltaTime;
    const finalProgress = THREE.MathUtils.clamp(morphProgress, 0, 1);

    particles.material.opacity = 1.0 - THREE.MathUtils.clamp(handState.isPinching, 0, 1);

    const currentPositions = particles.geometry.attributes.position;
    const saberPosAttr = particles.geometry.attributes.saberPosition, spherePosAttr = particles.geometry.attributes.spherePosition;
    const currentColors = particles.geometry.attributes.color;
    const saberColAttr = particles.geometry.attributes.saberColor, sphereColAttr = particles.geometry.attributes.sphereColor;

    const sphereRotationMatrix = new THREE.Matrix4().makeRotationAxis(tiltedAxis, elapsedTime * 0.2);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const saberVec = new THREE.Vector3().fromBufferAttribute(saberPosAttr, i);
        const sphereVec = new THREE.Vector3().fromBufferAttribute(spherePosAttr, i);
        sphereVec.applyMatrix4(sphereRotationMatrix);
        currentPositions.setXYZ(i, ...saberVec.lerp(sphereVec, finalProgress).toArray());
        const saberCol = new THREE.Color().fromBufferAttribute(saberColAttr, i);
        const sphereCol = new THREE.Color().fromBufferAttribute(sphereColAttr, i);
        currentColors.setXYZ(i, ...saberCol.lerp(sphereCol, finalProgress).toArray());
    }
    currentPositions.needsUpdate = true;
    currentColors.needsUpdate = true;

    const isSphereVisible = finalProgress > 0.5;
    if (targetHandState.isPinching && handState.isPinching > 0.8 && !selectedPlane) {
        selectedPlane = imagePlanes[Math.floor(elapsedTime * 0.5) % imagePlanes.length];
    } else if (!targetHandState.isPinching && handState.isPinching < 0.2 && selectedPlane) {
        selectedPlane = null;
    }

    imagePlanes.forEach((plane, index) => {
        plane.visible = isSphereVisible;
        if (!isSphereVisible) { plane.material.opacity = 0; return; }

        const isSelected = (plane === selectedPlane);
        const targetOpacity = (isSphereVisible && !selectedPlane) ? 0.8 : (isSelected ? 1.0 : 0.0);
        const targetScale = isSelected ? 2.5 : 1.0;

        let targetPosition;
        if (isSelected) {
            targetPosition = new THREE.Vector3(0, 0, 1.5);
        } else {
            const orbitRadius = 2.2; // Reduced orbit to match smaller sphere
            const angle = elapsedTime * 0.4 + (index / imagePlanes.length) * Math.PI * 2;
            targetPosition = new THREE.Vector3(Math.cos(angle) * orbitRadius, 0, Math.sin(angle) * orbitRadius);
            targetPosition.applyMatrix4(sphereRotationMatrix);
        }

        plane.position.lerp(targetPosition, 0.05);
        plane.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.05);
        plane.material.opacity += (targetOpacity - plane.material.opacity) * 0.1;
        plane.lookAt(camera.position);
    });

    renderer.render(scene, camera);
}

// --- Initialization and Resize ---
window.addEventListener('load', () => {
    setupParticleSystem();
    setupImagePlanes();
    animate();
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});