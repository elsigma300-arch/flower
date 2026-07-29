/**
 * FLOWER BY RZ PROJECT
 * Interactive Botanical Experience (6 Flowers + Love Particles + Precise Tracking)
 */

class MathUtils {
    static lerp(start, end, amt) {
        return (1 - amt) * start + amt * end;
    }

    static distance(p1, p2) {
        return Math.hypot(p2.x - p1.x, p2.y - p1.y);
    }
}

// ==========================================
// EFEK PARTIKEL HATI / LOPE-LOPE FLOATING
// ==========================================
class HeartParticleSystem {
    constructor(count = 25) {
        this.particles = Array.from({ length: count }, () => this.createHeart());
    }

    createHeart() {
        return {
            x: Math.random(),
            y: Math.random() + 0.2,
            size: Math.random() * 12 + 8,
            speedY: Math.random() * 0.0008 + 0.0003,
            speedX: Math.sin(Math.random() * Math.PI) * 0.0003,
            opacity: Math.random() * 0.6 + 0.2,
            rotation: Math.random() * 0.4 - 0.2
        };
    }

    updateAndRender(ctx, width, height) {
        ctx.save();
        this.particles.forEach(p => {
            p.y -= p.speedY;
            p.x += p.speedX;

            if (p.y < -0.1) {
                Object.assign(p, this.createHeart());
                p.y = 1.1;
            }

            ctx.save();
            ctx.translate(p.x * width, p.y * height);
            ctx.rotate(p.rotation);
            ctx.globalAlpha = p.opacity;
            ctx.fillStyle = '#ff69b4';

            // Menggambar Bentuk Lope-Lope (Heart Shape Path)
            ctx.beginPath();
            const topCurveHeight = p.size * 0.3;
            ctx.moveTo(0, topCurveHeight);
            ctx.bezierCurveTo(0, 0, -p.size / 2, 0, -p.size / 2, topCurveHeight);
            ctx.bezierCurveTo(-p.size / 2, (p.size + topCurveHeight) / 2, 0, p.size, 0, p.size);
            ctx.bezierCurveTo(0, p.size, p.size / 2, (p.size + topCurveHeight) / 2, p.size / 2, topCurveHeight);
            ctx.bezierCurveTo(p.size / 2, 0, 0, 0, 0, topCurveHeight);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        });
        ctx.restore();
    }
}

// ==========================================
// DESAIN BUNGA SVG & PROSEDURAL (6 BUNGA)
// ==========================================
class Flower {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.petals = Math.floor(Math.random() * 2) + 5; // 5-6 Kelopak
        this.scale = 0;
        this.targetScale = 0;
        this.rotation = Math.random() * Math.PI * 2;
        this.colors = ['#FFC0CB', '#FF9ECF', '#FFB6D5', '#F8A5C2', '#FF69B4'];
        this.baseColor = this.colors[Math.floor(Math.random() * this.colors.length)];
    }

    setBloom(state) {
        this.targetScale = state ? 1 : 0;
    }

    update() {
        // Elastic Spring Easing Animation
        const force = (this.targetScale - this.scale) * 0.12;
        this.scale += force;
    }

    draw(ctx) {
        if (this.scale <= 0.01) return;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(this.scale, this.scale);
        ctx.rotate(this.rotation);

        // Glow Pink Bunga
        ctx.shadowBlur = 18;
        ctx.shadowColor = '#FF1493';

        // Menggambar Kelopak Bunga (Path Vector)
        const angleStep = (Math.PI * 2) / this.petals;
        for (let i = 0; i < this.petals; i++) {
            ctx.save();
            ctx.rotate(i * angleStep);

            const grad = ctx.createLinearGradient(0, 0, 0, -28);
            grad.addColorStop(0, '#ffffff');
            grad.addColorStop(0.5, this.baseColor);
            grad.addColorStop(1, '#ff1493');

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.bezierCurveTo(-10, -15, -8, -28, 0, -32);
            ctx.bezierCurveTo(8, -28, 10, -15, 0, 0);
            ctx.fill();
            ctx.restore();
        }

        // Putik Tengah Bunga (Kuning pastel)
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#FFF59D';
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

// ==========================================
// BATANG & 6 CABANG BUNGA
// ==========================================
class PlantStem {
    constructor() {
        this.baseX = 0;
        this.baseY = 0;
        this.tipX = 0;
        this.tipY = 0;
        this.vx = 0;
        this.vy = 0;
        this.opacity = 0;
        this.targetOpacity = 0;

        // INISIALISASI TEPAT 6 BUNGA
        this.flowers = Array.from({ length: 6 }, () => new Flower(0, 0));
    }

    update(targetX, targetY, isVisible) {
        this.targetOpacity = isVisible ? 1 : 0;
        this.opacity = MathUtils.lerp(this.opacity, this.targetOpacity, 0.1);

        const dx = targetX - this.baseX;
        const dy = targetY - this.baseY;

        this.baseX = MathUtils.lerp(this.baseX, targetX, 0.25);
        this.baseY = MathUtils.lerp(this.baseY, targetY, 0.25);

        // Wind & Inertia Simulation
        const wind = Math.sin(performance.now() * 0.003) * 10;
        this.vx = MathUtils.lerp(this.vx, dx * 0.12 + wind, 0.08);
        this.vy = MathUtils.lerp(this.vy, dy * 0.12, 0.08);

        this.tipX = this.baseX - this.vx;
        this.tipY = this.baseY - 160 - this.vy;

        // POSISI TEPAT KETENAM (6) BUNGA PADA CABANG ORGANIK
        const ctrlX = (this.baseX + this.tipX) / 2;
        const ctrlY = (this.baseY + this.tipY) / 2;

        // 1. Bunga Puncak Utama
        this.flowers[0].x = this.tipX;
        this.flowers[0].y = this.tipY;

        // 2. Bunga Cabang Kiri Atas
        this.flowers[1].x = this.tipX - 45;
        this.flowers[1].y = this.tipY + 35;

        // 3. Bunga Cabang Kanan Atas
        this.flowers[2].x = this.tipX + 50;
        this.flowers[2].y = this.tipY + 45;

        // 4. Bunga Cabang Kiri Tengah
        this.flowers[3].x = ctrlX - 55;
        this.flowers[3].y = ctrlY;

        // 5. Bunga Cabang Kanan Tengah
        this.flowers[4].x = ctrlX + 55;
        this.flowers[4].y = ctrlY + 15;

        // 6. Bunga Cabang Bawah
        this.flowers[5].x = this.baseX - 35;
        this.flowers[5].y = this.baseY - 50;

        this.flowers.forEach(f => f.update());
    }

    toggleBloom(state) {
        this.flowers.forEach((f, index) => {
            // Mekar sedikit bergantian (staggered delay effect)
            setTimeout(() => f.setBloom(state), index * 60);
        });
    }

    draw(ctx) {
        if (this.opacity <= 0.01) return;

        ctx.save();
        ctx.globalAlpha = this.opacity;

        // Batang Utama Organic Green
        ctx.strokeStyle = '#437a47';
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';

        const ctrlX = (this.baseX + this.tipX) / 2 + Math.sin(performance.now() * 0.002) * 12;
        const ctrlY = (this.baseY + this.tipY) / 2;

        ctx.beginPath();
        ctx.moveTo(this.baseX, this.baseY);
        ctx.quadraticCurveTo(ctrlX, ctrlY, this.tipX, this.tipY);
        ctx.stroke();

        // 5 Cabang Menyamping ke Masing-Masing Bunga
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(this.tipX, this.tipY); ctx.lineTo(this.flowers[1].x, this.flowers[1].y);
        ctx.moveTo(this.tipX, this.tipY); ctx.lineTo(this.flowers[2].x, this.flowers[2].y);
        ctx.moveTo(ctrlX, ctrlY); ctx.lineTo(this.flowers[3].x, this.flowers[3].y);
        ctx.moveTo(ctrlX, ctrlY); ctx.lineTo(this.flowers[4].x, this.flowers[4].y);
        ctx.moveTo(this.baseX, this.baseY - 30); ctx.lineTo(this.flowers[5].x, this.flowers[5].y);
        ctx.stroke();

        // Render 6 Bunga
        this.flowers.forEach(f => f.draw(ctx));

        ctx.restore();
    }
}

// ==========================================
// DETEKTOR GESTUR TANGAN
// ==========================================
class GestureDetector {
    static isOpenPalm(landmarks) {
        const wrist = landmarks[0];
        const tips = [8, 12, 16, 20];
        const mcps = [5, 9, 13, 17];
        let count = 0;
        tips.forEach((tip, i) => {
            if (MathUtils.distance(landmarks[tip], wrist) > MathUtils.distance(landmarks[mcps[i]], wrist)) count++;
        });
        return count >= 4;
    }

    static isFist(landmarks) {
        const wrist = landmarks[0];
        const tips = [8, 12, 16, 20];
        const mcps = [5, 9, 13, 17];
        let count = 0;
        tips.forEach((tip, i) => {
            if (MathUtils.distance(landmarks[tip], wrist) < MathUtils.distance(landmarks[mcps[i]], wrist)) count++;
        });
        return count >= 3;
    }

    static isPinch(landmarks) {
        return MathUtils.distance(landmarks[4], landmarks[8]) < 0.06;
    }
}

// ==========================================
// APLIKASI UTAMA (MAIN ENGINE)
// ==========================================
class App {
    constructor() {
        this.video = document.getElementById('video');
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.fpsCounter = document.getElementById('fps-counter');
        this.startScreen = document.getElementById('start-screen');
        this.startBtn = document.getElementById('start-btn');

        this.hearts = new HeartParticleSystem(25);
        this.plant = new PlantStem();

        this.isPlantActive = false;
        this.isBloomed = false;
        this.lastPinchState = false;

        this.lastTime = performance.now();
        this.frameCount = 0;
        this.isProcessingHand = false;

        this.bindEvents();
    }

    bindEvents() {
        this.startBtn.addEventListener('click', () => {
            this.startScreen.classList.add('hidden');
            this.init();
        });
    }

    async init() {
        this.initMediaPipe();
        await this.initWebcam();
        requestAnimationFrame((t) => this.renderLoop(t));
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

        this.hands.onResults((res) => this.onHandResults(res));
    }

    async initWebcam() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 1280, height: 720, frameRate: { ideal: 60 } },
                audio: false
            });
            this.video.srcObject = stream;
            await this.video.play();

            // SINKRONISASI UKURAN KANVAS SAMA PERSIS DENGAN WEBCAM
            this.canvas.width = this.video.videoWidth || 1280;
            this.canvas.height = this.video.videoHeight || 720;
        } catch (err) {
            console.error("Gagal Akses Kamera:", err);
            this.fpsCounter.innerText = "NO CAMERA ACCESS";
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

        // --- GESTURE TANGAN KANAN (MUNCUL/HILANG TANAMAN) ---
        if (rightHand) {
            const palmCenter = {
                x: (rightHand[0].x + rightHand[9].x) / 2 * this.canvas.width,
                y: (rightHand[0].y + rightHand[9].y) / 2 * this.canvas.height
            };

            if (GestureDetector.isOpenPalm(rightHand)) {
                this.isPlantActive = true;
            } else if (GestureDetector.isFist(rightHand)) {
                this.isPlantActive = false;
            }

            this.plant.update(palmCenter.x, palmCenter.y, this.isPlantActive);
        } else {
            this.plant.update(this.plant.baseX, this.plant.baseY, false);
        }

        // --- GESTURE TANGAN KIRI (PINCH TOGGLE MEKAR 6 BUNGA) ---
        if (leftHand) {
            const isPinching = GestureDetector.isPinch(leftHand);
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
        // Asynchronous Loop Handler
        if (this.video.readyState >= 2 && !this.isProcessingHand) {
            this.isProcessingHand = true;
            this.hands.send({ image: this.video }).catch(() => { this.isProcessingHand = false; });
        }

        // Clear Canvas Frame
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw Ambient Floating Heart Particles
        this.hearts.updateAndRender(this.ctx, this.canvas.width, this.canvas.height);

        // Draw 6 Flowers Plant Stem
        this.plant.draw(this.ctx);

        // FPS Tracker Engine
        this.frameCount++;
        if (currentTime - this.lastTime >= 1000) {
            this.fpsCounter.innerText = `FPS: ${this.frameCount}`;
            this.frameCount = 0;
            this.lastTime = currentTime;
        }

        requestAnimationFrame((t) => this.renderLoop(t));
    }
}

// Start Main App Instance
window.addEventListener('DOMContentLoaded', () => {
    new App();
});
