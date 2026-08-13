export function canvasBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("image_export_failed")), "image/png", 0.94);
  });
}
