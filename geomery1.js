const canvas = document.getElementById("patternCanvas");
const ctx = canvas.getContext("2d");
const lineCountInput = document.getElementById("lineCount");
const generateButton = document.getElementById("generateButton");

let generatedSegments = [];

function polygonArea(polygon) {
  let sum = 0;

  for (let i = 0; i < polygon.length; i += 1) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    sum += a.x * b.y - b.x * a.y;
  }

  return Math.abs(sum) / 2;
}

function chooseCellByArea(cells) {
  const areas = cells.map((cell) => Math.max(polygonArea(cell), 0.000001));
  const total = areas.reduce((sum, area) => sum + area, 0);
  let cursor = Math.random() * total;

  for (let i = 0; i < cells.length; i += 1) {
    cursor -= areas[i];
    if (cursor <= 0) return i;
  }

  return cells.length - 1;
}

function rotatePolygon(polygon, startIndex) {
  return polygon
    .slice(startIndex)
    .concat(polygon.slice(0, startIndex));
}

function pointOnSegment(a, b, t) {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t
  };
}

function splitCell(polygon) {
  const vertexIndex = Math.floor(Math.random() * polygon.length);
  const rotated = rotatePolygon(polygon, vertexIndex);

  // With a triangle there is one opposite edge.
  // With a quadrilateral there are two non-adjacent edges.
  const targetEdgeIndex =
    polygon.length === 3
      ? 1
      : Math.random() < 0.5
        ? 1
        : 2;

  const edgeStart = rotated[targetEdgeIndex];
  const edgeEnd = rotated[targetEdgeIndex + 1];

  // Avoid extremely small slivers near the existing vertices.
  const t = 0.22 + Math.random() * 0.56;
  const splitPoint = pointOnSegment(edgeStart, edgeEnd, t);
  const sourcePoint = rotated[0];

  const first = [
    sourcePoint,
    ...rotated.slice(1, targetEdgeIndex + 1),
    splitPoint
  ];

  const second = [
    sourcePoint,
    splitPoint,
    ...rotated.slice(targetEdgeIndex + 1)
  ];

  return {
    polygons: [first, second],
    segment: [sourcePoint, splitPoint]
  };
}

function generatePattern(lineCount) {
  const cells = [
    [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 }
    ]
  ];

  const segments = [];

  for (let i = 0; i < lineCount; i += 1) {
    const cellIndex = chooseCellByArea(cells);
    const cell = cells[cellIndex];
    const result = splitCell(cell);

    cells.splice(cellIndex, 1, ...result.polygons);
    segments.push(result.segment);
  }

  generatedSegments = segments;
  drawPattern();
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.max(1, window.devicePixelRatio || 1);

  const pixelWidth = Math.max(1, Math.round(rect.width * dpr));
  const pixelHeight = Math.max(1, Math.round(rect.height * dpr));

  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawPattern();
}

function drawPattern() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  if (!width || !height) return;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "#111111";
  ctx.lineWidth = 1;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.beginPath();

  for (const [a, b] of generatedSegments) {
    ctx.moveTo(a.x * width, a.y * height);
    ctx.lineTo(b.x * width, b.y * height);
  }

  ctx.stroke();
}

function normalizedLineCount() {
  const raw = Number.parseInt(lineCountInput.value, 10);
  const value = Number.isFinite(raw) ? raw : 20;
  const clamped = Math.min(100, Math.max(1, value));

  lineCountInput.value = String(clamped);
  return clamped;
}

function handleGenerate() {
  generatePattern(normalizedLineCount());
}

generateButton.addEventListener("click", handleGenerate);

lineCountInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    handleGenerate();
  }
});

window.addEventListener("resize", resizeCanvas);

const resizeObserver = new ResizeObserver(resizeCanvas);
resizeObserver.observe(canvas.parentElement);

generatePattern(normalizedLineCount());
resizeCanvas();
