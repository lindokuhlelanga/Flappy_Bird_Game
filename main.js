const canvas = document.querySelector('canvas');
const webgl = canvas.getContext('webgl');
if (!webgl) {
    throw new Error("WebGL not available/supported!");
}

// ========== ADDED: Resize canvas function ==========
function resizeCanvas() {
    const wrapper = canvas.parentElement;
    const rect = wrapper.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    // Set WebGL viewport to match new canvas size
    webgl.viewport(0, 0, canvas.width, canvas.height);
}

// Call on load and resize
window.addEventListener('resize', resizeCanvas);
window.addEventListener('load', resizeCanvas);
resizeCanvas(); // Initial call
// ===================================================

let image = new Image();
webgl.clearColor(0, 0, 0, 0);

// Initial position and velocity of the bird
let birdPosition = [0, 0.5];
let birdVelocity = [0, 0];

// Pillar settings
const pillarWidth = 0.2;
const pillarGap = 0.9;
let pillarSpeed = 0.01;
let pillarPosition = 1;
let openingPosition = Math.random() * 1.6 - 0.9;
const openingHeight = 0.5;

// High score and current score
let highScore = 0;
let currentScore = 0;
document.getElementById("highScore").innerText = "🏆 High Score: " + highScore;
document.getElementById("currentScore").innerText = currentScore;

// Speed display
let speedMultiplier = 1.0;
document.getElementById("speedDisplay").innerText = "⚡ Speed: " + speedMultiplier.toFixed(1) + "x";

// Flag to track whether the game is paused
let isPaused = false;

// Flag to track if sound has been initialized
let soundInitialized = false;

// ========== SOUND INITIALIZATION ==========
function initializeSounds() {
    if (!soundInitialized) {
        // Play and pause each sound to initialize
        const sounds = [
            document.getElementById("flapSound"),
            document.getElementById("collisionSound"),
            document.getElementById("scoreSound")
        ];
        
        sounds.forEach(sound => {
            sound.volume = 0.3;
            sound.play().then(() => {
                sound.pause();
                sound.currentTime = 0;
            }).catch(err => console.log("Sound init:", err));
        });
        
        soundInitialized = true;
    }
}

// ========== ENHANCED SOUND FUNCTIONS ==========
function playFlapSound() {
    const flapSound = document.getElementById("flapSound");
    flapSound.currentTime = 0;
    flapSound.volume = 0.3;
    flapSound.play().catch(err => console.log("Flap sound error:", err));
}

function playCollisionSound() {
    const collisionSound = document.getElementById("collisionSound");
    collisionSound.currentTime = 0;
    collisionSound.volume = 0.5;
    collisionSound.play().catch(err => console.log("Collision sound error:", err));
}

function playScoreSound() {
    const scoreSound = document.getElementById("scoreSound");
    scoreSound.currentTime = 0;
    scoreSound.volume = 0.4;
    scoreSound.play().catch(err => console.log("Score sound error:", err));
}

// ========== CANVAS CLICK TO FLAP ==========
canvas.addEventListener('click', (e) => {
    if (!isPaused) {
        birdVelocity[1] = 0.01;
        playFlapSound();
    }
    e.preventDefault(); // Prevent any default behavior
});

// Prevent touch gestures from scrolling
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (!isPaused) {
        birdVelocity[1] = 0.01;
        playFlapSound();
    }
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
}, { passive: false });

// Event listeners for key down and key up events
window.addEventListener('keydown', handleKeyDown);
window.addEventListener('keyup', handleKeyUp);

// Update function
function checkCollision() {
    const birdX = birdPosition[0];
    const birdY = birdPosition[1];
    const pillarLeftX = pillarPosition;
    const pillarRightX = pillarPosition + pillarWidth;
    const pillarTopY = openingPosition + openingHeight / 2;
    const pillarBottomY = openingPosition - openingHeight / 2;

    // Check if the bird's X position is within the horizontal bounds of the pillar
    if (
        birdX >= pillarLeftX &&
        birdX <= pillarRightX
    ) {
        // Check if the bird's Y position is above or below the opening
        if (
            (birdY < pillarTopY && birdY < pillarBottomY) ||
            (birdY > pillarTopY && birdY > pillarBottomY)
        ) {
            // Collision detected, end the game
            playCollisionSound();
            endGame();
        }
    }
}

// Update function
function update() {
    if (isPaused) {
        return;
    }

    const gravity = 0.0003;
    birdVelocity[1] -= gravity;

    birdPosition[0] += birdVelocity[0];
    birdPosition[1] += birdVelocity[1];

    if (birdPosition[1] >= 1 || birdPosition[1] <= -1) {
        playCollisionSound();
        endGame();
        return;
    }

    pillarPosition -= pillarSpeed;
    if (pillarPosition < -1) {
        pillarPosition = 1;
        openingPosition = Math.random() * 1.6 - 0.8;
        currentScore++;
        document.getElementById("currentScore").innerText = currentScore;
        
        // Update high score
        if (currentScore > highScore) {
            highScore = currentScore;
            document.getElementById("highScore").innerText = "🏆 High Score: " + highScore;
        }
        
        playScoreSound();
    }

    // Check for collision between the bird and the pillars
    checkCollision();

    webgl.clear(webgl.COLOR_BUFFER_BIT);

    const topPillarVertices = [
        pillarPosition, 1,
        pillarPosition + pillarWidth, 1,
        pillarPosition, openingPosition + openingHeight / 2,
        pillarPosition + pillarWidth, openingPosition + openingHeight / 2,
    ];

    const bottomPillarVertices = [
        pillarPosition, -1,
        pillarPosition + pillarWidth, -1,
        pillarPosition, openingPosition - openingHeight / 2,
        pillarPosition + pillarWidth, openingPosition - openingHeight / 2
    ];

    const vsSource = `
        attribute vec2 pos;
        void main() { 
            gl_Position = vec4(pos, 0, 1.0);
        }`;

    const fsSource = `
        void main() { 
            gl_FragColor = vec4(0, 0, 0, 1);
        }`;

    const program = createProgram(vsSource, fsSource);

    drawBird(program, birdPosition);
    renderPillars(program, topPillarVertices, bottomPillarVertices);

    requestAnimationFrame(update);
}


// Function to create shader program
function createProgram(vsSource, fsSource) {
    const vertexShader = webgl.createShader(webgl.VERTEX_SHADER);
    webgl.shaderSource(vertexShader, vsSource);
    webgl.compileShader(vertexShader);

    const fragmentShader = webgl.createShader(webgl.FRAGMENT_SHADER);
    webgl.shaderSource(fragmentShader, fsSource);
    webgl.compileShader(fragmentShader);

    const program = webgl.createProgram();
    webgl.attachShader(program, vertexShader);
    webgl.attachShader(program, fragmentShader);
    webgl.linkProgram(program);
    webgl.useProgram(program);

    return program;
}

// Start game function
function startGame() {
    initializeSounds(); // Initialize sounds on first user interaction
    isPaused = false;
    update();
}

// Pause game function
function pauseGame() {
    isPaused = true;
}

// Restart game function
function restartGame() {
    initializeSounds(); // Initialize sounds if not already done
    isPaused = false;
    currentScore = 0;
    document.getElementById("currentScore").innerText = currentScore;
    birdPosition = [0, 0.5];
    birdVelocity = [0, 0];
    pillarSpeed = 0.01;
    speedMultiplier = 1.0;
    document.getElementById("speedDisplay").innerText = "⚡ Speed: " + speedMultiplier.toFixed(1) + "x";
    pillarPosition = 1;
    openingPosition = Math.random() * 1.6 - 0.9;

    // Hide the game over image
    const gameOverImage = document.getElementById("gameOverImage");
    gameOverImage.style.display = "none";

    update();
}


// Event listener for start button
document.querySelector('.Start-button').addEventListener('click', startGame);

// Event listener for pause button
document.querySelector('.Pause-button').addEventListener('click', pauseGame);

// Event listener for restart button
document.querySelector('.Restart-button').addEventListener('click', restartGame);

// Function to handle key down events
function handleKeyDown(event) {
    initializeSounds(); // Initialize on first key press
    
    switch (event.key) {
        case "ArrowUp":
        case " ": // Spacebar
            if (!isPaused) {
                birdVelocity[1] = 0.01;
                playFlapSound();
            }
            event.preventDefault(); // Prevent page scroll
            break;
        case "ArrowLeft":
            birdVelocity[0] = -0.01;
            event.preventDefault(); // Prevent page scroll
            break;
        case "ArrowRight":
            birdVelocity[0] = 0.01;
            event.preventDefault(); // Prevent page scroll
            break;
        case "ArrowDown":
            birdVelocity[1] -= 0.01;
            event.preventDefault(); // Prevent page scroll
            break;
    }
}

// Function to handle key up events
function handleKeyUp(event) {
    switch (event.key) {
        case "ArrowLeft":
        case "ArrowRight":
            birdVelocity[0] = 0;
            break;
    }
}

// Function to draw the bird (circle)
function drawBird(program, position) {
    const numSegments = 50; // Number of segments to approximate the circle
    const circleRadius = 0.05; // Radius of the circle

    let vertices = [];
    for (let i = 0; i < numSegments; i++) {
        const angle = (i / numSegments) * Math.PI * 2;
        const x = Math.cos(angle) * circleRadius + position[0];
        const y = Math.sin(angle) * circleRadius + position[1];
        vertices.push(x, y);
    }

    const birdBuffer = webgl.createBuffer();
    webgl.bindBuffer(webgl.ARRAY_BUFFER, birdBuffer);
    webgl.bufferData(webgl.ARRAY_BUFFER, new Float32Array(vertices), webgl.STATIC_DRAW);

    const posAttributeLocation = webgl.getAttribLocation(program, "pos");
    webgl.enableVertexAttribArray(posAttributeLocation);
    webgl.bindBuffer(webgl.ARRAY_BUFFER, birdBuffer);
    webgl.vertexAttribPointer(posAttributeLocation, 2, webgl.FLOAT, false, 0, 0);
    webgl.drawArrays(webgl.TRIANGLE_FAN, 0, vertices.length / 2);
}

// Function to render pillars
function renderPillars(program, topVertices, bottomVertices) {
    const topBuffer = webgl.createBuffer();
    webgl.bindBuffer(webgl.ARRAY_BUFFER, topBuffer);
    webgl.bufferData(webgl.ARRAY_BUFFER, new Float32Array(topVertices), webgl.STATIC_DRAW);

    const topPosAttributeLocation = webgl.getAttribLocation(program, "pos");
    webgl.enableVertexAttribArray(topPosAttributeLocation);
    webgl.bindBuffer(webgl.ARRAY_BUFFER, topBuffer);
    webgl.vertexAttribPointer(topPosAttributeLocation, 2, webgl.FLOAT, false, 0, 0);
    webgl.drawArrays(webgl.TRIANGLE_STRIP, 0, 4);

    const bottomBuffer = webgl.createBuffer();
    webgl.bindBuffer(webgl.ARRAY_BUFFER, bottomBuffer);
    webgl.bufferData(webgl.ARRAY_BUFFER, new Float32Array(bottomVertices), webgl.STATIC_DRAW);

    const bottomPosAttributeLocation = webgl.getAttribLocation(program, "pos");
    webgl.enableVertexAttribArray(bottomPosAttributeLocation);
    webgl.bindBuffer(webgl.ARRAY_BUFFER, bottomBuffer);
    webgl.vertexAttribPointer(bottomPosAttributeLocation, 2, webgl.FLOAT, false, 0, 0);
    webgl.drawArrays(webgl.TRIANGLE_STRIP, 0, 4);
}

// Increase pillar speed every 10 seconds
setInterval(() => {
    pillarSpeed += 0.001;
    speedMultiplier = pillarSpeed / 0.01;
    document.getElementById("speedDisplay").innerText = "⚡ Speed: " + speedMultiplier.toFixed(1) + "x";
}, 10000);

// Function to end the game
function endGame() {
    pauseGame();
    const gameOverImage = document.getElementById("gameOverImage");
    gameOverImage.style.display = "block";
}

// ========== INFO MODAL ==========
const modal = document.getElementById("infoModal");
const infoBtn = document.querySelector(".info-button");
const closeBtn = document.querySelector(".close");

infoBtn.addEventListener("click", () => {
    modal.style.display = "block";
});

closeBtn.addEventListener("click", () => {
    modal.style.display = "none";
});

window.addEventListener("click", (event) => {
    if (event.target == modal) {
        modal.style.display = "none";
    }
});
