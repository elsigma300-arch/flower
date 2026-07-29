import { HandLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0";

// Global Smoothing Utility (Exponential Moving Average)
class Vector2 {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    lerp(target, alpha) {
        this.x += (target.x - this.x) * alpha;
        this.y += (target.y - this.y) * alpha;
        return this;
    }

    set(x, y) {
        this.x = x;
        this.y = y;
    }
}

// Single Flower Unit Logic & SVG Generation
class Flower {
    constructor(parentG, x, y, scale = 1) {
        this.parentG = parentG;
        this.pos = new Vector2(x, y);
        this.baseScale = scale;
        this.currentScale = 0;
        this.targetScale = 0;
        
        // Spring Physics Properties
        this.velocity = 0;
        this.stiffness = 0.15;
        this.damping = 0.75;
        
        this.isOpen = false;
        this.petalsCount = 6;
        
        this.initDOM();
    }

    initDOM() {
        this.element = document.createElementNS("http://www.w3.org/2000/svg", "g");
        this.element.setAttribute("class", "flower-group");
        
        // Create Petals
        for (let i = 0; i < this.petalsCount; i++) {
            const angle = (i * 360) / this.petalsCount;
            const petal = document.createElementNS("http://www.w3.org/2000/svg", "path");
            petal.setAttribute("class", "petal");
            petal.setAttribute("d", "M 0 0 C -8 -15, -12 -30, 0 -40 C 12 -30, 8 -15, 0 0");
            petal.setAttribute("transform", `rotate(${angle})`);
            this.element.appendChild(petal);
        }

        // Create Center Callus
        const center = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        center.setAttribute("class", "flower-center");
        center.setAttribute("cx", "0");
        center.setAttribute("cy", "0");
        center.setAttribute("r", "5");
        this.element.appendChild(center);

        this.parentG.appendChild(this.element);
    }

    update(x, y, windAngle) {
        this.pos.set(x, y);
        
        // Spring animation physics loop
        const force = (this.targetScale - this.currentScale) * this.stiffness;
        this.velocity = (this.velocity + force) * this.damping;
        this.currentScale += this.velocity;

        const renderScale = Math.max(0, this.currentScale * this.baseScale);
        const rotation = windAngle * 10;
        
        this.element.setAttribute(
            "transform", 
            `translate(${this.pos.x}, ${this.pos.y}) scale(${renderScale}) rotate(${rotation})`
        );
    }

    bloom() {
        this.targetScale = 1;
        this.isOpen = true;
        this.element.classList.add("bloomed");
    }

    close() {
        this.targetScale = 0.25; // Fold petals down without destroying
        this.isOpen = false;
        this.element.classList.remove("bloomed");
    }
}

// Procedural Branching & Organic Stem System
class PlantStem {
    constructor(svgContainer) {
        this.svgContainer = svgContainer;
        this.basePos = new Vector2(0, 0);
        this.smoothedPos = new Vector2(0, 0);
        this.growth = 0; // 0 to 1
        this.targetGrowth = 0;
        this.opacity = 0;
        
        this.branches = [];
        this.flowers = [];
        this.windOffset = Math.random() * 1000;

        this.initDOM();
        this.generateStructure();
    }

    initDOM() {
        this.group = document.createElementNS("http://www.w3.org/2000/svg", "g");
        
        this.pathElem = document.createElementNS("http://www.w3.org/2000/svg", "path");
        this.pathElem.setAttribute("class", "flora-stem");
        this.pathElem.setAttribute("stroke-width", "6");
        
        this.group.appendChild(this.pathElem);
        this.svgContainer.appendChild(this.group);
    }

    generateStructure() {
        // Build branching geometry schema relative to base stem
        this.branchConfigs = [
            { length: 180, angle: -Math.PI / 2, width: 6, depth: 0 },
            { length: 90, angle: -Math.PI / 3, width: 4, depth: 1, attachRatio: 0.5 },
            { length: 80, angle: -Math.PI * 0.7, width: 4, depth: 1, attachRatio: 0.7 },
            { length: 50, angle: -Math.PI / 4, width: 2.5, depth: 2, attachRatio: 0.8 }
        ];
    }

    update(handPos, isHandOpen, time) {
        // Growth & Opacity Fading
        if (isHandOpen) {
            this.targetGrowth = 1;
            this.opacity = Math.min(1, this.opacity + 0.05);
        } else {
            this.targetGrowth = 0;
            this.opacity = Math.max(0, this.opacity - 0.03); // 300-500ms fade out
        }

        this.growth += (this.targetGrowth - this.growth) * 0.08;
        this.smoothedPos.lerp(handPos, 0.2); // Position smoothing

        if (this.opacity <= 0.01) {
            this.group.setAttribute("visibility", "hidden");
            return;
        }
        this.group.setAttribute("visibility", "visible");
        this.group.setAttribute("opacity", this.opacity);

        // Wind sway computation
        const wind = Math.sin(time * 0.002 + this.windOffset) * 0.15;

        // Construct SVG Path dynamically
        const points = [];
        const startX = this.smoothedPos.x;
        const startY = this.smoothedPos.y;
        
        // Base Stem Curve
        const stemLength = 160 * this.growth;
        const ctrlX = startX + Math.sin(wind) * 30;
        const ctrlY = startY - stemLength * 0.5;
        const endX = startX + Math.sin(wind * 1.5) * 45;
        const endY = startY - stemLength;

        const pathData = `M ${startX} ${startY} Q ${ctrlX} ${ctrlY}, ${endX} ${endY}`;
        this.pathElem.setAttribute("d", pathData);

        // Lazily instantiate flowers at key branch endpoints
        if (this.flowers.length === 0 && this.growth > 0.8) {
            this.flowers.push(new Flower(this.group, endX, endY, 1.0));
            this.flowers.push(new Flower(this.group, ctrlX + 30, ctrlY - 20, 0.8));
            this.flowers.push(new Flower(this.group, ctrlX - 35, ctrlY - 40, 0.75));
        }

        // Update active flower transforms
        if (this.flowers.length > 0) {
            this.flowers[0].update(endX, endY, wind);
            this.flowers[1].update(ctrlX + 30 * this.growth, ctrlY - 20 * this.growth, wind);
            this.flowers[2].update(ctrlX - 35 * this.growth, ctrlY - 40 * this.growth, wind);
        }
    }

    toggleBloom(forceState) {
        this.flowers.forEach((flower, index) => {
            setTimeout(() => {
                if (forceState !== undefined) {
                    forceState ? flower.bloom() : flower.close();
                } else {
                    flower.isOpen ? flower.close() : flower.bloom();
                }
            }, index * 80); // Staggered bloom transition
        });
    }
}

// MediaPipe & Main Application Controller
class App {
    constructor() {
        this.video = document.getElementById("webcam");
        this.svgContainer = document.getElementById("flora-group");
        this.fpsDisplay = document.getElementById("fps-counter");
        
        this.rightHandPos = new Vector2(0, 0);
        this.isRightHandOpen = false;
        
        this.lastPinchState = false;
        this.pinchCooldown = false;
        
        this.frameCount = 0;
        this.lastFpsUpdate = performance.now();
        
        this.initPlant();
        this.initMediaPipe();
    }

    initPlant() {
        this.plant = new PlantStem(this.svgContainer);
    }

    async initMediaPipe() {
        const vision = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
        );
        
        this.landmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
                delegate: "GPU"
            },
            runningMode: "VIDEO",
            numHands: 2
        });

        this.startCamera();
    }

    async startCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 1280, height: 720, frameRate: { ideal: 60 } }
            });
            this.video.srcObject = stream;
            this.video.addEventListener("loadeddata", () => {
                this.renderLoop();
            });
        } catch (err) {
            console.error("Camera access denied or unreadable:", err);
            this.fpsDisplay.innerText = "Error: Camera access required.";
        }
    }

    detectGestures(results) {
        if (!results.landmarks || results.landmarks.length === 0) {
            this.isRightHandOpen = false;
            return;
        }

        const width = window.innerWidth;
        const height = window.innerHeight;

        for (let i = 0; i < results.landmarks.length; i++) {
            const landmarks = results.landmarks[i];
            const handedness = results.handednesses[i][0].categoryName; 
            // Note: Webcam is mirrored via CSS, MediaPipe labels reflect raw feed

            if (handedness === "Left") { // Acts as Right Hand visually due to mirroring
                const palmCenter = landmarks[9]; // Middle MCP
                
                // Mirror coordinates to align visually with scaleX(-1) video
                const x = (1 - palmCenter.x) * width;
                const y = palmCenter.y * height;
                this.rightHandPos.set(x, y);

                // Fist vs Open Palm Check based on distance between palm center & fingertips
                const tips = [8, 12, 16, 20];
                let avgDist = 0;
                tips.forEach(tip => {
                    const dx = landmarks[tip].x - palmCenter.x;
                    const dy = landmarks[tip].y - palmCenter.y;
                    avgDist += Math.sqrt(dx * dx + dy * dy);
                });
                avgDist /= tips.length;

                this.isRightHandOpen = avgDist > 0.25; // Threshold for open palm
            } else if (handedness === "Right") { // Acts as Left Hand visually
                // Left Hand Pinch Detection (Thumb tip: 4, Index tip: 8)
                const thumb = landmarks[4];
                const index = landmarks[8];
                const dist = Math.sqrt(
                    Math.pow(thumb.x - index.x, 2) + Math.pow(thumb.y - index.y, 2)
                );

                const isPinching = dist < 0.07;
                if (isPinching && !this.lastPinchState && !this.pinchCooldown) {
                    this.plant.toggleBloom();
                    this.pinchCooldown = true;
                    setTimeout(() => { this.pinchCooldown = false; }, 400); // Debounce
                }
                this.lastPinchState = isPinching;
            }
        }
    }

    renderLoop() {
        const now = performance.now();
        
        // Frame processing with MediaPipe
        if (this.video.currentTime > 0) {
            const results = this.landmarker.detectForVideo(this.video, now);
            this.detectGestures(results);
        }

        // Update Plant Physics & Render Graphics
        this.plant.update(this.rightHandPos, this.isRightHandOpen, now);

        // Performance Counter
        this.frameCount++;
        if (now - this.lastFpsUpdate >= 1000) {
            this.fpsDisplay.innerText = `FPS: ${this.frameCount}`;
            this.frameCount = 0;
            this.lastFpsUpdate = now;
        }

        requestAnimationFrame(() => this.renderLoop());
    }
}

// Instantiate application on page load
window.addEventListener("DOMContentLoaded", () => {
    new App();
});
