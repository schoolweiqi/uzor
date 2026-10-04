const canvas = document.getElementById("patternCanvas");
const ctx = canvas.getContext("2d");
const lineCountInput = document.getElementById("lineCount");
const allow4Button = document.getElementById("allow4Button");
const allow5Button = document.getElementById("allow5Button");
const generateButton = document.getElementById("generateButton");

const MIN_ANGLE_DEGREES = 20;
const MAX_GENERATION_ATTEMPTS = 3000;
const MAX_PATTERN_RESTARTS = 8;
const MIN_CELL_AREA_RATIO = 0.06;

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

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function splitVertexToEdge(polygon) {
  if (polygon.length < 3) return null;

  const vertexIndex = Math.floor(Math.random() * polygon.length);
  const rotated = rotatePolygon(polygon, vertexIndex);
  const targetEdgeIndex =
    1 + Math.floor(Math.random() * (rotated.length - 2));

  const edgeStart = rotated[targetEdgeIndex];
  const edgeEnd = rotated[targetEdgeIndex + 1];
  const splitPoint = pointOnSegment(
    edgeStart,
    edgeEnd,
    randomBetween(0.24, 0.76)
  );
  const sourcePoint = rotated[0];

  return {
    polygons: [
      [
        sourcePoint,
        ...rotated.slice(1, targetEdgeIndex + 1),
        splitPoint
      ],
      [
        sourcePoint,
        splitPoint,
        ...rotated.slice(targetEdgeIndex + 1)
      ]
    ],
    segment: [sourcePoint, splitPoint]
  };
}

function splitVertexToVertex(polygon) {
  if (polygon.length < 4) return null;

  const firstIndex = Math.floor(Math.random() * polygon.length);
  const candidates = [];

  for (let i = 0; i < polygon.length; i += 1) {
    if (i === firstIndex) continue;

    const distance = (i - firstIndex + polygon.length) % polygon.length;

    if (distance !== 1 && distance !== polygon.length - 1) {
      candidates.push(i);
    }
  }

  if (!candidates.length) return null;

  let secondIndex =
    candidates[Math.floor(Math.random() * candidates.length)];

  let start = firstIndex;
  let end = secondIndex;

  if (start > end) {
    [start, end] = [end, start];
  }

  return {
    polygons: [
      polygon.slice(start, end + 1),
      polygon.slice(end).concat(polygon.slice(0, start + 1))
    ],
    segment: [polygon[start], polygon[end]]
  };
}

function splitEdgeToEdge(polygon) {
  if (polygon.length < 3) return null;

  const firstEdge = Math.floor(Math.random() * polygon.length);
  let secondEdge = Math.floor(Math.random() * (polygon.length - 1));

  if (secondEdge >= firstEdge) {
    secondEdge += 1;
  }

  const firstPoint = pointOnSegment(
    polygon[firstEdge],
    polygon[(firstEdge + 1) % polygon.length],
    randomBetween(0.24, 0.76)
  );

  const secondPoint = pointOnSegment(
    polygon[secondEdge],
    polygon[(secondEdge + 1) % polygon.length],
    randomBetween(0.24, 0.76)
  );

  const expanded = [];
  let firstPointIndex = -1;
  let secondPointIndex = -1;

  for (let i = 0; i < polygon.length; i += 1) {
    expanded.push(polygon[i]);

    if (i === firstEdge) {
      firstPointIndex = expanded.length;
      expanded.push(firstPoint);
    }

    if (i === secondEdge) {
      secondPointIndex = expanded.length;
      expanded.push(secondPoint);
    }
  }

  let startIndex = firstPointIndex;
  let endIndex = secondPointIndex;
  let segmentStart = firstPoint;
  let segmentEnd = secondPoint;

  if (startIndex > endIndex) {
    [startIndex, endIndex] = [endIndex, startIndex];
    [segmentStart, segmentEnd] = [segmentEnd, segmentStart];
  }

  return {
    polygons: [
      expanded.slice(startIndex, endIndex + 1),
      expanded
        .slice(endIndex)
        .concat(expanded.slice(0, startIndex + 1))
    ],
    segment: [segmentStart, segmentEnd]
  };
}

function angleAtVertex(previous, current, next, width, height) {
  const ax = (previous.x - current.x) * width;
  const ay = (previous.y - current.y) * height;
  const bx = (next.x - current.x) * width;
  const by = (next.y - current.y) * height;

  const lengthA = Math.hypot(ax, ay);
  const lengthB = Math.hypot(bx, by);

  if (lengthA < 0.000001 || lengthB < 0.000001) {
    return 0;
  }

  const cosine = Math.max(
    -1,
    Math.min(1, (ax * bx + ay * by) / (lengthA * lengthB))
  );

  return Math.acos(cosine) * 180 / Math.PI;
}

function hasMinimumAngles(polygon, width, height) {
  for (let i = 0; i < polygon.length; i += 1) {
    const previous = polygon[(i - 1 + polygon.length) % polygon.length];
    const current = polygon[i];
    const next = polygon[(i + 1) % polygon.length];

    if (
      angleAtVertex(previous, current, next, width, height) <
      MIN_ANGLE_DEGREES
    ) {
      return false;
    }
  }

  return true;
}

function getAllowedCornerCounts() {
  const allowed = new Set([3]);

  if (allow4Button.getAttribute("aria-pressed") === "true") {
    allowed.add(4);
  }

  if (allow5Button.getAttribute("aria-pressed") === "true") {
    allowed.add(5);
  }

  return allowed;
}

function isValidSplit(result, sourcePolygon, allowedCorners, width, height) {
  if (!result) return false;

  const sourceArea = polygonArea(sourcePolygon);

  return result.polygons.every((polygon) => {
    if (!allowedCorners.has(polygon.length)) {
      return false;
    }

    const area = polygonArea(polygon);

    if (area < sourceArea * MIN_CELL_AREA_RATIO) {
      return false;
    }

    return hasMinimumAngles(polygon, width, height);
  });
}

function tryBuildPattern(lineCount, allowedCorners, width, height) {
  const cells = [
    [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 }
    ]
  ];

  const segments = [];
  const splitters = [
    splitVertexToEdge,
    splitVertexToVertex,
    splitEdgeToEdge
  ];

  for (let lineIndex = 0; lineIndex < lineCount; lineIndex += 1) {
    let accepted = false;

    for (
      let attempt = 0;
      attempt < MAX_GENERATION_ATTEMPTS;
      attempt += 1
    ) {
      const cellIndex = chooseCellByArea(cells);
      const sourcePolygon = cells[cellIndex];
      const splitter =
        splitters[Math.floor(Math.random() * splitters.length)];
      const result = splitter(sourcePolygon);

      if (
        !isValidSplit(
          result,
          sourcePolygon,
          allowedCorners,
          width,
          height
        )
      ) {
        continue;
      }

      cells.splice(cellIndex, 1, ...result.polygons);
      segments.push(result.segment);
      accepted = true;
      break;
    }

    if (!accepted) {
      return null;
    }
  }

  return segments;
}

function generatePattern(lineCount) {
  const width = Math.max(1, canvas.clientWidth);
  const height = Math.max(1, canvas.clientHeight);
  const allowedCorners = getAllowedCornerCounts();

  for (let restart = 0; restart < MAX_PATTERN_RESTARTS; restart += 1) {
    const result = tryBuildPattern(
      lineCount,
      allowedCorners,
      width,
      height
    );

    if (result) {
      generatedSegments = result;
      drawPattern();
      return;
    }
  }

  generatedSegments = [];
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
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "#ffffff";
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
  const clamped = Math.min(30, Math.max(1, value));

  lineCountInput.value = String(clamped);
  return clamped;
}

function toggleCornerOption(button) {
  const isPressed = button.getAttribute("aria-pressed") === "true";
  button.setAttribute("aria-pressed", String(!isPressed));
}

function handleGenerate() {
  generatePattern(normalizedLineCount());
}

allow4Button.addEventListener("click", () => {
  toggleCornerOption(allow4Button);
});

allow5Button.addEventListener("click", () => {
  toggleCornerOption(allow5Button);
});

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
