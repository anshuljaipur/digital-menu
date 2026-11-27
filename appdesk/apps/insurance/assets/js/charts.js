// assets/js/charts.js
// Minimal dependency-free canvas charts. Plain script — attaches to window.IPM.

(function (IPM) {

function prepCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  return { ctx, w: rect.width, h: rect.height };
}

function drawDonut(canvas, data, colors) {
  const { ctx, w, h } = prepCanvas(canvas);
  ctx.clearRect(0, 0, w, h);
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const cx = w / 2, cy = h / 2, r = Math.min(w, h) / 2 - 6, rInner = r * 0.62;
  let start = -Math.PI / 2;
  data.forEach((d, i) => {
    const angle = (d.value / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, start, start + angle);
    ctx.arc(cx, cy, rInner, start + angle, start, true);
    ctx.closePath();
    ctx.fillStyle = colors[i % colors.length];
    ctx.fill();
    start += angle;
  });
  ctx.font = '600 15px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-primary') || '#1a1d29';
  ctx.fillText(total.toLocaleString('en-IN'), cx, cy + 5);
}

function drawBar(canvas, labels, values, color) {
  const { ctx, w, h } = prepCanvas(canvas);
  ctx.clearRect(0, 0, w, h);
  const max = Math.max(...values, 1);
  const pad = 28, gap = 10;
  const barW = (w - pad * 2 - gap * (values.length - 1)) / values.length;
  const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary') || '#666';
  values.forEach((v, i) => {
    const bh = (v / max) * (h - 40);
    const x = pad + i * (barW + gap);
    const y = h - 24 - bh;
    const grad = ctx.createLinearGradient(0, y, 0, h - 24);
    grad.addColorStop(0, color);
    grad.addColorStop(1, color + '99');
    ctx.fillStyle = grad;
    roundRect(ctx, x, y, barW, bh, 6);
    ctx.fill();
    ctx.fillStyle = textColor;
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(labels[i], x + barW / 2, h - 8);
  });
}

function drawLine(canvas, labels, values, color) {
  const { ctx, w, h } = prepCanvas(canvas);
  ctx.clearRect(0, 0, w, h);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const pad = 24;
  const stepX = (w - pad * 2) / (values.length - 1 || 1);
  const scaleY = (h - 40) / ((max - min) || 1);

  ctx.beginPath();
  values.forEach((v, i) => {
    const x = pad + i * stepX;
    const y = h - 24 - (v - min) * scaleY;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.stroke();

  const areaGrad = ctx.createLinearGradient(0, 0, 0, h);
  areaGrad.addColorStop(0, color + '33');
  areaGrad.addColorStop(1, color + '00');
  ctx.lineTo(pad + (values.length - 1) * stepX, h - 24);
  ctx.lineTo(pad, h - 24);
  ctx.closePath();
  ctx.fillStyle = areaGrad;
  ctx.fill();

  const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary') || '#666';
  ctx.fillStyle = textColor;
  ctx.font = '11px Inter, sans-serif';
  ctx.textAlign = 'center';
  values.forEach((v, i) => {
    const x = pad + i * stepX;
    ctx.fillText(labels[i], x, h - 6);
  });
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

IPM.drawDonut = drawDonut;
IPM.drawBar = drawBar;
IPM.drawLine = drawLine;

})(window.IPM = window.IPM || {});
