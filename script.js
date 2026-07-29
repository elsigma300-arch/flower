/**
 * INTERACTIVE VIRTUAL FLOWER EXPERIENCE
 * Modular Architecture: HandTracker, GestureDetector, PhysicsEngine, Stem, Flower, SceneRenderer
 */

// ==========================================
// 1. PHYSICS & UTILS ENGINE
// ==========================================
class MathUtils {
    static lerp(start, end, amt) {
        return (1 - amt) * start + amt * end;
    }

    static distance(p1, p2) {
        return Math.hypot(p2.x - p1.x, p2.y - p1.y);
    }
}

class ParticleSystem {
    constructor(count = 40) {
        this.particles = Array.from({ length: count }, () => ({
            x: Math.random(),
            y: Math.random(),
            size: Math.random() * 2 + 1,
            speedY: Math.random() * 0.0005 + 0.0002,
            opacity: Math.random() * 0.5 + 0.2
        }));
    }

    updateAndRender(ctx, width, height) {
        ctx.save();
        this.particles.forEach(p => {
            p.y -= p.speedY;
            if (p.y < 0) p.y = 1;

            ctx.fillStyle = `rgba(255, 192, 203, ${p.opacity})`;
            ctx.beginPath();
            ctx.arc(p.x * width, p.y * height, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.restore();
    }
}

// ==========================================
// 2. BOTANICAL PROCEDURAL ARTWORK (SVG/PATH)
// ==========================================
class Leaf {
    constructor(offsetRatio, side) {
        this.offsetRatio = offsetRatio; // Posisi sepanjang cabang (0 - 1)
        this.side = side; // -1 (kiri) atau 1 (kanan)
        this.size = Math.random() * 8 + 10;
    }

    draw(ctx, x, y, angle) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle + (this.side * Math.PI / 4));
        
        ctx.fillStyle = '#4e8752';
        ctx.beginPath();
        ctx.ellipse(0, 0, this.size, this.size / 2.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class Flower {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.petals = Math.floor(Math.random() * 3) + 5; // 5 - 7 Kelopak
        this.scale = 0;
        this.targetScale = 0;
        this.bloomState = false; // Is bloomed toggle
        this.rotation = Math.random() * Math.PI * 2;
        
        // Color Palette
        this.colors = ['#FFC0CB', '#FF9ECF', '#FFB6D5', '#F8A5C2'];
        this.baseColor = this.colors[Math.floor(Math.random() * this.colors.length)];
    }

    setBloom(state) {
        this.bloomState = state;
        this.targetScale = state ? 1 : 0;
    }

    update() {
        // Spring physics Easing untuk mekar / menutup
        const force = (this.targetScale - this.scale) * 0.1;
        this.scale += force;
    }

    draw(ctx) {
        if (this.scale <= 0.01) return;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(this.scale, this.scale);
        ctx.rotate(this.rotation);

        // Glow Effect
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#FF9ECF';

        // Draw Petals (Kelopak SVG Gradient Visual)
        const angleStep = (Math.PI * 2) / this.petals;
        for (let i = 0; i < this.petals; i++) {
            ctx.save();
            ctx.rotate(i * angleStep);

            const grad = ctx.createLinearGradient(0, 0, 0, -25);
            grad.addColorStop(0, '#fff0f5');
            grad.addColorStop(0.6, this.baseColor);
            grad.addColorStop(1, '#e87ea1');

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.bezierCurveTo(-12, -15, -8, -30, 0, -35);
            ctx.bezierCurveTo(8, -30, 12, -15, 0, 0);
            ctx.fill();
            ctx.restore();
        }

        // Inner Yellow Center
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#FFF59D';
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

class PlantStem {
    constructor() {
        this.reset();
    }

    reset() {
        this.baseX = 0;
        this.baseY = 0;
        this.tipX = 0;
        this.tipY = 0;
        
        this.vx = 0; // Velocity untuk swaying
        this.vy = 0;

        this.opacity = 0;
        this.targetOpacity = 0;

        // Cabang & Bunga
        this.flowers = [];
        this.leaves = [];
        this.initBotanicalStructure();
    }

    initBotanicalStructure() {
        this.flowers = [];
        this.leaves = [];

        // 3 Ujung Bunga Utama
        for (let i = 0; i < 4; i++) {
            this.flowers.push(new Flower(0, 0));
        }

        // Daun opsional
        for (let i = 0; i < 6; i++) {
            this.leaves.push(new Leaf(0.2 + (i * 0.12), i % 2 === 0 ? 1 : -1));
        }
    }

    update(targetX, targetY, isVisible) {
        this.targetOpacity = isVisible ? 1 : 0;
        this.opacity = MathUtils.lerp(this.opacity, this.targetOpacity, 0.08);

        // Inersia & Spring Physics saat tangan bergerak
        const dx = targetX - this.baseX;
        const dy = targetY - this.baseY;

        this.baseX = MathUtils.lerp(this.baseX, targetX, 0.2);
        this.baseY = MathUtils.lerp(this.baseY, targetY, 0.2);

        // Tip Swaying (Efek angin & gerakan elastis)
        const wind = Math.sin(performance.now() * 0.003) * 12;
        this.vx = MathUtils.lerp(this.vx, dx * 0.15 + wind, 0.05);
        this.vy = MathUtils.lerp(this.vy, dy * 0.15, 0.05);

        this.tipX = this.baseX - this.vx;
        this.tipY = this.baseY - 140 - this.vy;

        // Synchronize Flowers
        if (this.flowers.length >= 4) {
            // Main flower
            this.flowers[0].x = this.tipX;
            this.flowers[0].y = this.tipY;

            // Side Branches
            this.flowers[1].x = this.tipX - 40;
            this.flowers[1].y = this.tipY + 30;

            this.flowers[2].x = this.tipX + 45;
            this.flowers[2].y = this.tipY + 40;

            this.flowers[3].x = this.tipX - 10;
            this.flowers[3].y = this.tipY + 70;
        }

        this.flowers.forEach(f => f.update());
    }

    toggleBloom(state) {
        this.flowers.forEach(f => f.setBloom(state));
    }

    draw(ctx) {
        if (this.opacity <= 0.01) return;

        ctx.save();
        ctx.globalAlpha = this.opacity;

        // Batang Utama Organic Smooth Bezier Curve
        ctx.strokeStyle = '#3a663d';
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';

        const ctrlX = (this.baseX + this.tipX) / 2 + Math.sin(performance.now() * 0.002) * 15;
        const ctrlY = (this.baseY + this.tipY) / 2;

        ctx.beginPath();
        ctx.moveTo(this.baseX, this.baseY);
        ctx.quadraticCurveTo(ctrlX, ctrlY, this.tipX, this.tipY);
        ctx.stroke();

        // Cabang-cabang Samping
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(ctrlX, ctrlY);
        ctx.lineTo(this.tipX - 40, this.tipY + 30);
        ctx.moveTo(ctrlX, ctrlY + 20);
        ctx.lineTo(this.tipX + 45, this.tipY + 40);
        ctx.stroke();

        // Daun-daun
        this.leaves.forEach(leaf => {
            const lx = MathUtils.lerp(this.baseX, this.tipX, leaf.offsetRatio);
            const ly = MathUtils.lerp(this.baseY, this.tipY, leaf.offsetRatio);
            leaf.draw(ctx, lx, ly, Math.atan2(this.tipY - this.baseY, this.tipX - this.baseX));
        });

        // Bunga-bunga
        this.flowers.forEach(f => f.draw(ctx));

        ctx.restore();
    }
}

// ==========================================
// 3. GESTURE RECOGNIZER
// ==========================================
class GestureDetector {
    // Memeriksa Open Palm (Semua jari terbuka relatif terhadap pergelangan tangan/wrist)
    static isOpenPalm(landmarks) {
        const wrist = landmarks[0];
        const tips = [8, 12, 16, 20]; // Index, Middle, Ring, Pinky Tips
        const mcps = [5, 9, 13, 17];

        let extendedCount = 0;
        tips.forEach((tipIdx, i) => {
            if (MathUtils.distance(landmarks[tipIdx], wrist) > MathUtils.distance(landmarks[mcps[i]], wrist)) {
                extendedCount++;
            }
        });
        return extendedCount >= 4;
    }

    // Memeriksa Fist (Mengepal)
    static isFist(landmarks) {
        const wrist = landmarks[0];
        const tips = [8, 12, 16, 20];
        const mcps = [5, 9, 13, 17];

        let closedCount = 0;
        tips.forEach((tipIdx, i) => {
            if (MathUtils.distance(landmarks[tipIdx], wrist) < MathUtils.distance(landmarks[mcps[i]], wrist)) {
                closedCount++;
            }
        });
        return closedCount >= 3;
    }

    // Memeriksa Pinch (Ujung Ibu Jari & Telunjuk Berdekatan)
    static isPinch(landmarks) {
        const thumbTip = landmarks[4];
        const indexTip = landmarks[8];
        return MathUtils.distance(thumbTip, indexTip) < 0.06;
    }
}

// ==========================================
// 4. MAIN ENGINE & TRACKER
// ==========================================
class InteractiveArtApp {
    constructor() {
        this.video = document.getElementById('video');
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.fpsCounter = document.getElementById('fps-counter');

        this.particles = new ParticleSystem(30);
        this.plant = new PlantStem();

        // State Logic
        this.isPlantActive = false;
        this.isBloomed = false;
        this.lastPinchState = false;

        // Performance & FPS
        this.lastTime = performance.now();
        this.frameCount = 0;
        this.isProcessingHand = false;

        this.init();
    }

    async init() {
        this.initMediaPipe();
        await this.initWebcam();
        requestAnimationFrame((time) => this.renderLoop(time));
    }

    initMediaPipe() {
        this.hands = new Hands({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        });

        this.hands.setOptions({
            maxNumHands: 2,
            modelComplexity: 1,
            minDetectionConfidence: 0.65,
            minTrackingConfidence: 0.65
        });

        this.hands.onResults((results) => this.onHandResults(results));
    }

    async initWebcam() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 1280, height: 720, frameRate: { ideal: 60 } },
                audio: false
            });
            this.video.srcObject = stream;
            await this.video.play();
        } catch (err) {
            console.error("Gagal Mengakses Kamera: ", err);
            this.fpsCounter.innerText = "CAMERA ERROR";
        }
    }

    onHandResults(results) {
        let rightHand = null;
        let leftHand = null;

        if (results.multiHandLandmarks && results.multiHandedness) {
            results.multiHandedness.forEach((handedness, idx) => {
                const label = handedness.label;
                const landmarks = results.multiHandLandmarks[idx];

                if (label === 'Right') rightHand = landmarks;
                if (label === 'Left') leftHand = landmarks;
            });
        }

        // --- GESTURE 1 & 2: TANGAN KANAN (PLANT CREATION & DISAPPEAR) ---
        if (rightHand) {
            const palmCenter = {
                x: (rightHand[0].x + rightHand[9].x) / 2 * this.canvas.width,
                y: (rightHand[0].y + rightHand[9].y) / 2 * this.canvas.height
            };

            if (GestureDetector.isOpenPalm(rightHand)) {
                this.isPlantActive = true;
                this.plantTargetPos = palmCenter;
            } else if (GestureDetector.isFist(rightHand)) {
                this.isPlantActive = false;
            }

            if (this.isPlantActive && palmCenter) {
                this.plant.update(palmCenter.x, palmCenter.y, true);
            } else {
                this.plant.update(this.plant.baseX, this.plant.baseY, false);
            }
        } else {
            this.plant.update(this.plant.baseX, this.plant.baseY, false);
        }

        // --- GESTURE 3 & 4: TANGAN KIRI (PINCH BLOOM TOGGLE) ---
        if (leftHand) {
            const isPinching = GestureDetector.isPinch(leftHand);

            // Trigger Toggle hanya saat pinch terjadi pertama kali (Edge Trigger)
            if (isPinching && !this.lastPinchState) {
                this.isBloomed = !this.isBloomed;
                this.plant.toggleBloom(this.isBloomed);
            }
            this.lastPinchState = isPinching;
        } else {
            this.lastPinchState = false;
        }

        this.isProcessingHand = false;
    }

    renderLoop(currentTime) {
        // Dynamic Canvas Resize Synchronization
        if (this.video.videoWidth && (this.canvas.width !== this.video.videoWidth)) {
            this.canvas.width = this.video.videoWidth;
            this.canvas.height = this.video.videoHeight;
        }

        // Async Hand Tracking Call (Non-blocking FPS)
        if (this.video.readyState >= 2 && !this.isProcessingHand) {
            this.isProcessingHand = true;
            this.hands.send({ image: this.video }).catch(() => { this.isProcessingHand = false; });
        }

        // Draw Canvas Elements
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Render Background Dust Particles
        this.particles.updateAndRender(this.ctx, this.canvas.width, this.canvas.height);

        // Render Tanaman Virtual
        this.plant.draw(this.ctx);

        // FPS Engine Calculation
        this.frameCount++;
        if (currentTime - this.lastTime >= 1000) {
            this.fpsCounter.innerText = `FPS: ${this.frameCount}`;
            this.frameCount = 0;
            this.lastTime = currentTime;
        }

        requestAnimationFrame((time) => this.renderLoop(time));
    }
}

// Launch Application
window.addEventListener('DOMContentLoaded', () => {
    new InteractiveArtApp();
});
