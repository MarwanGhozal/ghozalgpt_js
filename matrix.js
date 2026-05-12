document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.createElement("canvas");
  canvas.id = "matrix";
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");

  // Responsive canvas size
  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  // Egyptian-style Unicode glyphs
  const glyphs = ["𓂀", "𓁹", "𓆑", "𓃭", "𓎛", "𓋴", "𓏏", "𓂻", "𓇋", "𓉔"];
  const fontSize = 24;
  const columns = Math.floor(window.innerWidth / fontSize);
  const drops = Array(columns).fill(1);

  function drawMatrix() {
    // Transparent black background for trail effect
    ctx.fillStyle = "rgba(10, 14, 23, 0.02)"; // Was 0.05

    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#00ff80"; // Gold-like color
    ctx.font = `${fontSize}px 'Segoe UI Symbol', serif`;

    for (let i = 0; i < drops.length; i++) {
      const glyph = glyphs[Math.floor(Math.random() * glyphs.length)];
      ctx.fillText(glyph, i * fontSize, drops[i] * fontSize);

      if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
        drops[i] = 0;
      }
      drops[i]++;
    }
  }

  setInterval(drawMatrix, 80);
});
