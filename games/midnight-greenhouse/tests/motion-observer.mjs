/* global CanvasRenderingContext2D, window */

export function observeMotion() {
  const draw = CanvasRenderingContext2D.prototype.drawImage;
  window.retroMotion = {};
  CanvasRenderingContext2D.prototype.drawImage = function (image, ...args) {
    if (image.src?.endsWith('-motion.webp') && args.length === 8 && this.canvas.closest('.game')) {
      const id = image.src.split('/').at(-1).replace('-motion.webp', '');
      const row = args[1] / args[3];
      const column = args[0] / args[2];
      const rows = window.retroMotion[id] ??= {};
      const frames = rows[row] ??= {};
      frames[column] = (frames[column] ?? 0) + 1;
    }
    return draw.call(this, image, ...args);
  };
}
