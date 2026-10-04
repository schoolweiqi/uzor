const canvas = document.getElementById("pendulumCanvas");
const stage = document.querySelector(".pendulum-stage");
const startButton = document.getElementById("startButton");

const angleA1Input = document.getElementById("angleA1");
const angleA2Input = document.getElementById("angleA2");
const angleB1Input = document.getElementById("angleB1");
const angleB2Input = document.getElementById("angleB2");

const context = canvas.getContext("2d");

const FRAME_DT = 0.1;
const STEP_MS = 1000 / 60;
const MASS = 1;
const GRAVITY = 9.81;
const TRAIL_LENGTH = 200;

let cssWidth = 1;
let cssHeight = 1;
let drawLength = 100;
let bobRadius = 8;
let physicsLength = 100;
let running = false;
let lastFrameTime = performance.now();
let accumulator = 0;

let pendulumA;
let pendulumB;

class DoublePendulum {
  constructor(theta1, theta2, color) {
    this.theta1 = theta1;
    this.theta2 = theta2;
    this.p1 = 0;
    this.p2 = 0;
    this.color = color;
    this.trail = [];
    this.cycle = 0;
  }

  update() {
    const delta = this.theta1 - this.theta2;
    const cosDelta = Math.cos(delta);
    const sinDelta = Math.sin(delta);
    const denominator = 16 - 9 * cosDelta * cosDelta;

    const prefactorTheta = 6 / (MASS * physicsLength * physicsLength);
    const prefactorMomentum = MASS * physicsLength * physicsLength / 2;
    const gravityTerm = GRAVITY / physicsLength;

    const theta1Dot = prefactorTheta *
      (2 * this.p1 - 3 * cosDelta * this.p2) / denominator;
    const theta2Dot = prefactorTheta *
      (8 * this.p2 - 3 * cosDelta * this.p1) / denominator;

    const p1Dot = -prefactorMomentum *
      (theta1Dot * theta2Dot * sinDelta + 3 * gravityTerm * Math.sin(this.theta1));
    const p2Dot = -prefactorMomentum *
      (-theta1Dot * theta2Dot * sinDelta + gravityTerm * Math.sin(this.theta2));

    this.theta1 += FRAME_DT * theta1Dot;
    this.theta2 += FRAME_DT * theta2Dot;
    this.p1 += FRAME_DT * p1Dot;
    this.p2 += FRAME_DT * p2Dot;

    const end = getPendulumPoints(this.theta1, this.theta2).end;
    this.trail.push({ x: end.x, y: end.y, cycle: this.cycle });

    if (this.trail.length > TRAIL_LENGTH) {
      this.trail.shift();
    }

    this.cycle = (this.cycle + 1) % 360;
  }

  render() {
    const points = getPendulumPoints(this.theta1, this.theta2);

    context.strokeStyle = this.color;
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(points.pivot.x, points.pivot.y);
    context.lineTo(points.middle.x, points.middle.y);
    context.lineTo(points.end.x, points.end.y);
    context.stroke();

    context.fillStyle = this.color;
    context.beginPath();
    context.arc(points.middle.x, points.middle.y, bobRadius, 0, Math.PI * 2);
    context.fill();

    context.beginPath();
    context.arc(points.end.x, points.end.y, bobRadius, 0, Math.PI * 2);
    context.fill();

    context.lineWidth = 1;
    for (let i = 1; i < this.trail.length; i += 1) {
      context.strokeStyle = `hsl(${this.trail[i].cycle}, 100%, 50%)`;
      context.beginPath();
      context.moveTo(this.trail[i - 1].x, this.trail[i - 1].y);
      context.lineTo(this.trail[i].x, this.trail[i].y);
      context.stroke();
    }
  }
}

function degreesToRadians(value) {
  return value * Math.PI / 180;
}

function normalizedAngle(input, fallback) {
  const value = Number.parseFloat(input.value);
  const normalized = Number.isFinite(value) ? value : fallback;
  input.value = String(normalized);
  return degreesToRadians(normalized);
}

function makePendulumsFromInputs() {
  pendulumA = new DoublePendulum(
    normalizedAngle(angleA1Input, 60),
    normalizedAngle(angleA2Input, 60),
    "#0000ff"
  );

  pendulumB = new DoublePendulum(
    normalizedAngle(angleB1Input, 61),
    normalizedAngle(angleB2Input, 60),
    "#ff0000"
  );
}

function startSimulation() {
  physicsLength = Math.max(1, drawLength);
  makePendulumsFromInputs();
  running = true;
  accumulator = 0;
  lastFrameTime = performance.now();
  render();
}

function getPendulumPoints(theta1, theta2) {
  const pivot = {
    x: cssWidth / 2,
    y: cssHeight / 2
  };

  const middle = {
    x: pivot.x + drawLength * Math.sin(theta1),
    y: pivot.y + drawLength * Math.cos(theta1)
  };

  const end = {
    x: middle.x + drawLength * Math.sin(theta2),
    y: middle.y + drawLength * Math.cos(theta2)
  };

  return { pivot, middle, end };
}

function resizeCanvas() {
  const rect = stage.getBoundingClientRect();
  const deviceScale = window.devicePixelRatio || 1;

  cssWidth = Math.max(1, rect.width);
  cssHeight = Math.max(1, rect.height);
  drawLength = 0.2 * Math.min(cssWidth, cssHeight);
  bobRadius = Math.max(3, 0.015 * Math.min(cssWidth, cssHeight));

  canvas.width = Math.max(1, Math.round(cssWidth * deviceScale));
  canvas.height = Math.max(1, Math.round(cssHeight * deviceScale));
  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;

  context.setTransform(deviceScale, 0, 0, deviceScale, 0, 0);
  render();
}

function render() {
  context.fillStyle = "#000";
  context.fillRect(0, 0, cssWidth, cssHeight);

  if (!pendulumA || !pendulumB) return;

  pendulumA.render();
  pendulumB.render();
}

function animate(now) {
  const elapsed = Math.min(250, now - lastFrameTime);
  lastFrameTime = now;

  if (running) {
    accumulator += elapsed;
    let steps = 0;

    while (accumulator >= STEP_MS && steps < 8) {
      pendulumA.update();
      pendulumB.update();
      accumulator -= STEP_MS;
      steps += 1;
    }
  }

  render();
  requestAnimationFrame(animate);
}

startButton.addEventListener("click", startSimulation);
window.addEventListener("resize", resizeCanvas);

makePendulumsFromInputs();
resizeCanvas();
requestAnimationFrame(animate);
