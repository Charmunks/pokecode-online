// Generates placeholder character spritesheets as canvas textures.
// These mimic the Pokemon Emerald overworld style: 16x32 per frame,
// 4 frames per direction (down, left, right, up), laid out as a 4x4 grid.
//
// Replace with real sprites by placing properly formatted spritesheets
// in public/assets/brendan.png and public/assets/may.png.
// Expected layout: 64x128 (4 cols x 4 rows, each frame 16x32)
// Row 0 = walk down, Row 1 = walk left, Row 2 = walk right, Row 3 = walk up

function generateCharacterSheet(color, accentColor, hairColor) {
  const frameW = 16;
  const frameH = 32;
  const cols = 4;
  const rows = 4;
  const canvas = document.createElement("canvas");
  canvas.width = frameW * cols;
  canvas.height = frameH * rows;
  const ctx = canvas.getContext("2d");

  const directions = ["down", "left", "right", "up"];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * frameW;
      const y = row * frameH;
      const isStep = col === 1 || col === 3;
      const stepDir = col === 1 ? -1 : col === 3 ? 1 : 0;

      // Body
      ctx.fillStyle = color;
      ctx.fillRect(x + 4, y + 12, 8, 12);

      // Head
      ctx.fillStyle = hairColor;
      ctx.fillRect(x + 3, y + 2, 10, 10);

      // Face
      ctx.fillStyle = "#FFDAB9";
      if (directions[row] === "down") {
        ctx.fillRect(x + 5, y + 5, 6, 5);
        // Eyes
        ctx.fillStyle = "#333";
        ctx.fillRect(x + 6, y + 6, 2, 2);
        ctx.fillRect(x + 9, y + 6, 2, 2);
      } else if (directions[row] === "up") {
        ctx.fillRect(x + 5, y + 8, 6, 2);
      } else if (directions[row] === "left") {
        ctx.fillRect(x + 3, y + 5, 5, 5);
        ctx.fillStyle = "#333";
        ctx.fillRect(x + 4, y + 6, 2, 2);
      } else {
        ctx.fillRect(x + 8, y + 5, 5, 5);
        ctx.fillStyle = "#333";
        ctx.fillRect(x + 10, y + 6, 2, 2);
      }

      // Legs
      ctx.fillStyle = accentColor;
      const legOffset = isStep ? stepDir * 2 : 0;
      ctx.fillRect(x + 4 + legOffset, y + 24, 3, 6);
      ctx.fillRect(x + 9 - legOffset, y + 24, 3, 6);

      // Shoes
      ctx.fillStyle = "#333";
      ctx.fillRect(x + 4 + legOffset, y + 28, 3, 2);
      ctx.fillRect(x + 9 - legOffset, y + 28, 3, 2);
    }
  }

  return canvas;
}

function generateGrassTile() {
  const canvas = document.createElement("canvas");
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#5dba3c";
  ctx.fillRect(0, 0, 16, 16);

  // Random grass details
  ctx.fillStyle = "#4da832";
  for (let i = 0; i < 6; i++) {
    const gx = Math.floor(Math.random() * 14);
    const gy = Math.floor(Math.random() * 14);
    ctx.fillRect(gx, gy, 2, 2);
  }

  return canvas;
}

function generatePathTile() {
  const canvas = document.createElement("canvas");
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#c4a67a";
  ctx.fillRect(0, 0, 16, 16);

  ctx.fillStyle = "#b89a6e";
  for (let i = 0; i < 4; i++) {
    const px = Math.floor(Math.random() * 14);
    const py = Math.floor(Math.random() * 14);
    ctx.fillRect(px, py, 2, 2);
  }

  return canvas;
}

function generateWaterTile() {
  const canvas = document.createElement("canvas");
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#3a8fd6";
  ctx.fillRect(0, 0, 16, 16);

  ctx.fillStyle = "#4a9fe6";
  ctx.fillRect(2, 4, 4, 1);
  ctx.fillRect(10, 8, 4, 1);
  ctx.fillRect(5, 12, 4, 1);

  return canvas;
}

function generateTreeTile() {
  const canvas = document.createElement("canvas");
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext("2d");

  // Background grass
  ctx.fillStyle = "#5dba3c";
  ctx.fillRect(0, 0, 16, 16);

  // Trunk
  ctx.fillStyle = "#8B4513";
  ctx.fillRect(6, 10, 4, 6);

  // Leaves
  ctx.fillStyle = "#2d7a1e";
  ctx.fillRect(2, 2, 12, 10);
  ctx.fillStyle = "#3a9428";
  ctx.fillRect(3, 1, 10, 4);

  return canvas;
}

function generateFlowerTile() {
  const canvas = document.createElement("canvas");
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#5dba3c";
  ctx.fillRect(0, 0, 16, 16);

  const colors = ["#e94560", "#f1c40f", "#fff"];
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = colors[i];
    const fx = 2 + Math.floor(i * 5);
    const fy = 4 + (i % 2) * 4;
    ctx.fillRect(fx, fy, 3, 3);
    ctx.fillStyle = "#4da832";
    ctx.fillRect(fx + 1, fy + 3, 1, 2);
  }

  return canvas;
}

function generateFenceTile() {
  const canvas = document.createElement("canvas");
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#5dba3c";
  ctx.fillRect(0, 0, 16, 16);

  ctx.fillStyle = "#8B6914";
  // Posts
  ctx.fillRect(1, 4, 2, 10);
  ctx.fillRect(13, 4, 2, 10);
  // Rails
  ctx.fillRect(0, 5, 16, 2);
  ctx.fillRect(0, 10, 16, 2);

  return canvas;
}
