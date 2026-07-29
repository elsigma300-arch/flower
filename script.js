import { HandLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0";

/**
 * MATH & SMOOTHING UTILITIES
 */
class Vector2 {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    set(x, y) {
        this.x = x;
        this.y = y;
        return this;
    }

    lerp(target, alpha) {
        this.x += (target.x - this.x) * alpha;
        this.y += (target.y - this.y) * alpha;
        return this;
    }

    distanceTo(v) {
        const dx = this.x - v.x;
        const dy = this.y - v.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
}

class ExponentialFilter {
    constructor(alpha = 0.35) {
        this.alpha = alpha;
        this.value = null;
    }

    filter(newValue) {
        if (this.value === null) {
            this.value = newValue;
        } else {
            this.value = this.value + this.alpha * (newValue - this.value);
        }
        return this.value;
    }

    reset() {
        this.value = null;
    }
}

/**
 * CAMERA MANAGER MODULE
 */
class CameraManager {
    constructor(videoElement, onError) {
        this.video = videoElement;
        this.onError = onError;
        this.stream = null;
    }

    async init() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    frameRate: { ideal: 60 }
                },
                audio: false
            });
            this.video.srcObject = this.stream;
            return new Promise((resolve) => {
                this.video.onloadedmetadata = () => {
                    this.video.play();
                    resolve(true);
                };
            });
        } catch (err) {
            this.onError("Camera Permission Error", "Unable to access webcam. Please verify device permissions.");
            return false;
        }
    }
}

/**
 * MATHEMATICAL GESTURE RECOGNIZER
 */
class GestureRecognizer {
    static getPalmCenter(landmarks, width, height) {
        // Average of Wrist (0), Index MCP (5), and Pinky MCP (17)
        const p0 = landmarks[0];
        const p5 = landmarks[5];
        const p17 = landmarks[17];

        const cx = (p0.x + p5.x + p17.x) / 3;
        const cy = (p0.y + p5.y + p17.y) / 3;

        // Mirror X axis to compensate for flipped video
        return new Vector2((1 - cx) * width, cy * height);
    }

    static getPalmRotation(landmarks) {
        // Vector from Wrist (0) to Middle Finger MCP (9)
        const p0 = landmarks[0];
        const p9 = landmarks[9];
        const dx = (1 - p9.x) - (1 - p0.x);
        const dy = p9.y - p0.y;
        return Math.atan2(dy, dx); // Radians
    }

    static getHandScale(landmarks) {
        // Distance between Wrist (0) and Middle Finger MCP (9)
        const p0 = landmarks[0];
        const p9 = landmarks[9];
        const dx = p9.x - p0.x;
        const dy = p9.y - p0.y;
        const dz = (p9.z || 0) - (p0.z || 0);
        return Math.sqrt(dx * dx + dy * dy + dz * dz) * 3.5;
    }

    static isOpenPalm(landmarks) {
        const p0 = landmarks[0];
        const tips = [8, 12, 16, 20];
        let totalDist = 0;

        tips.forEach(t => {
            const dx = landmarks[t].x - p0.x;
            const dy = landmarks[t].y - p0.y;
            totalDist += Math.sqrt(dx * dx + dy * dy);
        });

        const avgDist = totalDist / tips.length;
        return avgDist > 0.32; // Open palm threshold
    }

    static isFist(landmarks) {
        const p0 = landmarks[0];
        const tips = [8, 12, 16, 20];
        let totalDist = 0;

        tips.forEach(t => {
            const dx = landmarks[t].x - p0.x;
            const dy = landmarks[t].y - p0.y;
            totalDist += Math.sqrt(dx * dx + dy * dy);
        });

        const avgDist = totalDist / tips.length;
        return avgDist < 0.20; // Closed fist threshold
    }

    static isPinch(landmarks) {
        const thumbTip = landmarks[4];
        const indexTip = landmarks[8];
        const dx = thumbTip.x - indexTip.x;
        const dy = thumbTip.y - indexTip.y;
        const dz = (thumbTip.z || 0) - (indexTip.z || 0);
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        return dist < 0.06; // Pinch distance threshold
    }

    static isHandLeft(handedness) {
        // MediaPipe reports handedness for unmirrored feed
        return handedness === "Right"; // Mirrored feed swap
    }

    static isHandRight(handedness) {
        return handedness === "Left"; // Mirrored feed swap
    }
}

/**
 * MEDIAPIPE HAND TRACKER
 */
class HandTracker {
    constructor(onError) {
        this.onError = onError;
        this.landmarker = null;
        this.filters = {};
    }

    async init() {
        let retries = 3;
        while (retries > 0) {
            try {
                const vision = await FilesetResolver.forVisionTasks(
                    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
                );
                this.landmarker = await HandLandmarker.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
                        delegate: "GPU"
                    },
                    runningMode: "VIDEO",
                    numHands: 2,
                    minHandDetectionConfidence: 0.6,
                    minTrackingConfidence: 0.6
                });
                return true;
            } catch (err) {
                retries--;
                if (retries === 0) {
                    this.onError("MediaPipe Load Failure", "Failed to load hand tracking model after multiple attempts.");
                    return false;
                }
                await new Promise(r => setTimeout(r, 1000));
            }
        }
    }

    detect(video, timestamp) {
        if (!this.landmarker || video.readyState < 2) return null;
        return this.landmarker.detectForVideo(video, timestamp);
    }
}

/**
 * PROCEDURAL FLOWER UNIT
 */
class Flower {
    constructor(parentSVG, x, y, baseScale = 1.0) {
        this.parentSVG = parentSVG;
        this.pos = new Vector2(x, y);
        this.baseScale = baseScale;
        
        this.scale = 0;
        this.targetScale = 0;
        this.velocity = 0;
        this.stiffness = 0.12;
        this.damping = 0.72;

        this.isOpen = false;
        this.petalCount = 7;
        this.element = null;
        this.initDOM();
    }

    initDOM() {
        this.element = document.createElementNS("http://www.w3.org/2000/svg", "g");
        this.element.setAttribute("class", "flower-group");

        // Generate Petals
        for (let i = 0; i < this.petalCount; i++) {
            const angle = (i * 360) / this.petalCount;
            const petal = document.createElementNS("http://www.w3.org/2000/svg", "path");
            petal.setAttribute("class", "flower-petal");
            petal.setAttribute("d", "M 0 0 C -10 -20, -14 -35, 0 -48 C 14 -35, 10 -20, 0 0");
            petal.setAttribute("transform", `rotate(${angle})`);
            this.element.appendChild(petal);
        }

        // Generate Center Pistil
        const center = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        center.setAttribute("class", "flower-center");
        center.setAttribute("cx", "0");
        center.setAttribute("cy", "0");
        center.setAttribute("r", "6");
        this.element.appendChild(center);

        this.parentSVG.appendChild(this.element);
    }

    update(x, y, windAngle) {
        this.pos.set(x, y);

        // Spring Mechanics for Blooming (Scale 0 -> 1.15 -> 1.0)
        const force = (this.targetScale - this.scale) * this.stiffness;
        this.velocity = (this.velocity + force) * this.damping;
        this.scale += this.velocity;

        const activeScale = Math.max(0, this.scale * this.baseScale);
        const rotation = windAngle * 15;

        this.element.setAttribute(
            "transform",
            `translate(${this.pos.x}, ${this.pos.y}) scale(${activeScale}) rotate(${rotation})`
        );
    }

    bloom() {
        this.targetScale = 1.0;
        this.isOpen = true;
        this.element.setAttribute("filter", "url(#bloom-glow)");
    }

    close() {
        this.targetScale = 0.15; // Fold inward
        this.isOpen = false;
        this.element.removeAttribute("filter");
    }
}

/**
 * PROCEDURAL BRANCH & STEM GENERATOR WITH PHYSICS
 */
class StemGenerator {
    constructor(svgRoot) {
        this.svgRoot = svgRoot;
        this.pos = new Vector2(0, 0);
        this.smoothedPos = new Vector2(0, 0);
        this.rotation = 0;
        this.scale = 1.0;
        
        this.opacity = 0;
        this.targetOpacity = 0;
        this.growth = 0;
        this.targetGrowth = 0;

        this.flowers = [];
        this.windPhase = Math.random() * 100;
        this.initDOM();
    }

    initDOM() {
        this.group = document.createElementNS("http://www.w3.org/2000/svg", "g");
        
        this.stemPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
        this.stemPath.setAttribute("class", "flora-stem-path");
        this.stemPath.setAttribute("stroke-width", "8");
        this.group.appendChild(this.stemPath);

        // Procedural Branches
        this.branchPaths = [];
        for (let i = 0; i < 5; i++) {
            const bp = document.createElementNS("http://www.w3.org/2000/svg", "path");
            bp.setAttribute("class", "flora-stem-path");
            bp.setAttribute("stroke-width", `${5 - i * 0.7}`);
            this.group.appendChild(bp);
            this.branchPaths.push(bp);
        }

        this.svgRoot.appendChild(this.group);
    }

    update(targetPos, targetRot, targetScale, isAlive, time) {
        // Growth and Fade Out Mechanics
        if (isAlive) {
            this.targetGrowth = 1.0;
            this.targetOpacity = 1.0;
        } else {
            this.targetGrowth = 0.0;
            this.targetOpacity = 0.0;
        }

        this.growth += (this.targetGrowth - this.growth) * 0.08;
        this.opacity += (this.targetOpacity - this.opacity) * 0.05; // 300-500ms fade out

        if (this.opacity <= 0.01) {
            this.group.setAttribute("visibility", "hidden");
            return;
        }

        this.group.setAttribute("visibility", "visible");
        this.group.setAttribute("opacity", this.opacity.toFixed(3));

        // Smooth Transforms
        this.smoothedPos.lerp(targetPos, 0.2);
        this.rotation += (targetRot - this.rotation) * 0.15;
        this.scale += (targetScale - this.scale) * 0.15;

        // Physics & Wind Sway Calculation
        const wind = Math.sin(time * 0.003 + this.windPhase) * 0.2;
        const totalAngle = this.rotation - Math.PI / 2 + wind;

        // Base Trunk Bezier Curves
        const trunkLen = 180 * this.scale * this.growth;
        const x0 = this.smoothedPos.x;
        const y0 = this.smoothedPos.y;

        const ctrlX = x0 + Math.cos(totalAngle + 0.2) * (trunkLen * 0.5);
        const ctrlY = y0 + Math.sin(totalAngle + 0.2) * (trunkLen * 0.5);
        const x1 = x0 + Math.cos(totalAngle) * trunkLen;
        const y1 = y0 + Math.sin(totalAngle) * trunkLen;

        this.stemPath.setAttribute("d", `M ${x0} ${y0} Q ${ctrlX} ${ctrlY}, ${x1} ${y1}`);

        // Generate Procedural Branch Coordinates & Endpoints
        const branchEndpoints = [];
        const offsets = [-0.6, 0.5, -0.4, 0.6, -0.2];

        this.branchPaths.forEach((bp, idx) => {
            const ratio = (idx + 1) / 6;
            const bx0 = x0 + (x1 - x0) * ratio;
            const by0 = y0 + (y1 - y0) * ratio;

            const bLen = (90 - idx * 10) * this.scale * this.growth;
            const bAngle = totalAngle + offsets[idx];

            const bCtrlX = bx0 + Math.cos(bAngle + 0.1) * (bLen * 0.5);
            const bCtrlY = by0 + Math.sin(bAngle + 0.1) * (bLen * 0.5);
            const bx1 = bx0 + Math.cos(bAngle) * bLen;
            const by1 = by0 + Math.sin(bAngle) * bLen;

            bp.setAttribute("d", `M ${bx0} ${by0} Q ${bCtrlX} ${bCtrlY}, ${bx1} ${by1}`);
            branchEndpoints.push({ x: bx1, y: by1 });
        });

        // Initialize Flowers on Branch Tips
        if (this.flowers.length === 0 && this.growth > 0.5) {
            branchEndpoints.forEach(ep => {
                this.flowers.push(new Flower(this.group, ep.x, ep.y, 0.7 + Math.random() * 0.4));
            });
            // Trunk tip flower
            this.flowers.push(new Flower(this.group, x1, y1, 1.1));
        }

        // Update Flowers
        if (this.flowers.length > 0) {
            branchEndpoints.forEach((ep, i) => {
                if (this.flowers[i]) this.flowers[i].update(ep.x, ep.y, wind);
            });
            // Trunk tip flower update
            if (this.flowers[5]) this.flowers[5].update(x1, y1, wind);
        }
    }

    toggleBloom(forceState) {
        this.flowers.forEach((flower, idx) => {
            setTimeout(() => {
                if (forceState !== undefined) {
                    forceState ? flower.bloom() : flower.close();
                } else {
                    flower.isOpen ? flower.close() : flower.bloom();
                }
            }, idx * 60); // Organic staggered blooming sequence
        });
    }
}

/**
 * BACKGROUND PARTICLE SYSTEM
 */
class BackgroundParticles {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.particles = [];
        this.resize();
        this.init();

        window.addEventListener("resize", () => this.resize());
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    init() {
        this.particles = [];
        for (let i = 0; i < 40; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                radius: Math.random() * 2 + 1,
                alpha: Math.random() * 0.5 + 0.1,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3
            });
        }
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;

            if (p.x < 0) p.x = this.canvas.width;
            if (p.x > this.canvas.width) p.x = 0;
            if (p.y < 0) p.y = this.canvas.height;
            if (p.y > this.canvas.height) p.y = 0;

            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(255, 192, 203, ${p.alpha})`;
            this.ctx.fill();
        });
    }
}

/**
 * MAIN ORCHESTRATOR APPLICATION CLASS
 */
class App {
    constructor() {
        this.video = document.getElementById("webcam");
        this.svgRoot = document.getElementById("plant-root-group");
        this.bgCanvas = document.getElementById("bg-canvas");

        // UI Telemetry DOM Elements
        this.telRightGesture = document.getElementById("tel-right-gesture");
        this.telLeftGesture = document.getElementById("tel-left-gesture");
        this.telFloraState = document.getElementById("tel-flora-state");
        this.telBloomMode = document.getElementById("tel-bloom-mode");

        this.statFps = document.getElementById("stat-fps");
        this.statLatency = document.getElementById("stat-latency");

        // Debug DOM Elements
        this.dbgFps = document.getElementById("dbg-fps");
        this.dbgFrameTime = document.getElementById("dbg-frame-time");
        this.dbgLatency = document.getElementById("dbg-latency");
        this.dbgLandmarks = document.getElementById("dbg-landmarks");
        this.dbgRightConf = document.getElementById("dbg-right-conf");
        this.dbgLeftConf = document.getElementById("dbg-left-conf");
        this.dbgPalmRot = document.getElementById("dbg-palm-rot");
        this.dbgHandScale = document.getElementById("dbg-hand-scale");
        this.dbgMem = document.getElementById("dbg-mem");

        this.debugPanel = document.getElementById("debug-panel");
        this.errorModal = document.getElementById("error-dialog");

        // System Controllers
        this.particles = new BackgroundParticles(this.bgCanvas);
        this.camera = new CameraManager(this.video, (title, msg) => this.showError(title, msg));
        this.tracker = new HandTracker((title, msg) => this.showError(title, msg));
        this.plant = new StemGenerator(this.svgRoot);

        // State Tracking
        this.pinchCooldown = false;
        this.isBloomOpen = false;
        this.frameCount = 0;
        this.lastFpsTime = performance.now();

        this.initUI();
        this.start();
    }

    initUI() {
        document.getElementById("btn-toggle-debug").addEventListener("click", () => {
            this.debugPanel.classList.toggle("hidden");
        });

        document.querySelector(".close-debug").addEventListener("click", () => {
            this.debugPanel.classList.add("hidden");
        });

        window.addEventListener("keydown", (e) => {
            if (e.key === "d" || e.key === "D") {
                this.debugPanel.classList.toggle("hidden");
            }
        });

        document.getElementById("btn-reinit-cam").addEventListener("click", () => {
            location.reload();
        });

        document.getElementById("btn-error-retry").addEventListener("click", () => {
            this.errorModal.classList.add("hidden");
            this.start();
        });
    }

    showError(title, msg) {
        document.getElementById("error-title").innerText = title;
        document.getElementById("error-msg").innerText = msg;
        this.errorModal.classList.remove("hidden");
    }

    async start() {
        const camOk = await this.camera.init();
        if (!camOk) return;

        const trackerOk = await this.tracker.init();
        if (!trackerOk) return;

        this.loop();
    }

    loop() {
        const now = performance.now();
        const width = window.innerWidth;
        const height = window.innerHeight;

        // Background Particle Loop
        this.particles.render();

        // Perform Hand Tracking Inference
        const results = this.tracker.detect(this.video, now);

        let rightHandFound = false;
        let leftHandFound = false;

        if (results && results.landmarks && results.landmarks.length > 0) {
            let totalLandmarks = 0;

            for (let i = 0; i < results.landmarks.length; i++) {
                const landmarks = results.landmarks[i];
                totalLandmarks += landmarks.length;

                const handedness = results.handednesses[i][0].categoryName;
                const score = (results.handednesses[i][0].score * 100).toFixed(0);

                // RIGHT HAND LOGIC (Flora Host)
                if (GestureRecognizer.isHandRight(handedness)) {
                    rightHandFound = true;
                    this.dbgRightConf.innerText = `${score}%`;

                    const palmCenter = GestureRecognizer.getPalmCenter(landmarks, width, height);
                    const palmRotation = GestureRecognizer.getPalmRotation(landmarks);
                    const handScale = GestureRecognizer.getHandScale(landmarks);

                    const isOpen = GestureRecognizer.isOpenPalm(landmarks);
                    const isFist = GestureRecognizer.isFist(landmarks);

                    if (isOpen) {
                        this.telRightGesture.innerText = "OPEN PALM";
                        this.telFloraState.innerText = "GROWING";
                    } else if (isFist) {
                        this.telRightGesture.innerText = "CLOSED FIST";
                        this.telFloraState.innerText = "DECAYING";
                    } else {
                        this.telRightGesture.innerText = "NEUTRAL";
                    }

                    // Update Plant Generator
                    this.plant.update(palmCenter, palmRotation, handScale, isOpen, now);

                    this.dbgPalmRot.innerText = `${(palmRotation * (180 / Math.PI)).toFixed(1)}°`;
                    this.dbgHandScale.innerText = handScale.toFixed(2);
                }

                // LEFT HAND LOGIC (Pinch Controller)
                if (GestureRecognizer.isHandLeft(handedness)) {
                    leftHandFound = true;
                    this.dbgLeftConf.innerText = `${score}%`;

                    const isPinching = GestureRecognizer.isPinch(landmarks);

                    if (isPinching) {
                        this.telLeftGesture.innerText = "PINCH";
                        if (!this.pinchCooldown) {
                            this.isBloomOpen = !this.isBloomOpen;
                            this.plant.toggleBloom(this.isBloomOpen);
                            this.telBloomMode.innerText = this.isBloomOpen ? "BLOOMING" : "CLOSED";

                            this.pinchCooldown = true;
                            setTimeout(() => { this.pinchCooldown = false; }, 400); // 400ms Debounce
                        }
                    } else {
                        this.telLeftGesture.innerText = "OPEN";
                    }
                }
            }

            this.dbgLandmarks.innerText = totalLandmarks;
        } else {
            // Decay Plant when hands are out of view
            this.plant.update(this.plant.smoothedPos, this.plant.rotation, this.plant.scale, false, now);
        }

        if (!rightHandFound) {
            this.telRightGesture.innerText = "OFFLINE";
            this.telFloraState.innerText = "DORMANT";
            this.dbgRightConf.innerText = "0%";
        }

        if (!leftHandFound) {
            this.telLeftGesture.innerText = "OFFLINE";
            this.dbgLeftConf.innerText = "0%";
        }

        // Performance & Diagnostic Telemetry
        this.frameCount++;
        const frameDuration = performance.now() - now;

        if (now - this.lastFpsTime >= 1000) {
            const fps = this.frameCount;
            this.statFps.innerText = fps.toString().padStart(2, "0");
            this.dbgFps.innerText = fps;
            this.dbgFrameTime.innerText = `${frameDuration.toFixed(1)} ms`;
            this.dbgLatency.innerText = `${(frameDuration + 12).toFixed(1)} ms`;
            this.statLatency.innerText = `${(frameDuration + 12).toFixed(0)}ms`;

            if (performance.memory) {
                this.dbgMem.innerText = `${(performance.memory.usedJSHeapSize / 1048576).toFixed(1)} MB`;
            }

            this.frameCount = 0;
            this.lastFpsTime = now;
        }

        requestAnimationFrame(() => this.loop());
    }
}

// ENTRY POINT
window.addEventListener("DOMContentLoaded", () => {
    new App();
});
