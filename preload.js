const { contextBridge, ipcRenderer, webUtils } = require("electron");

window.addEventListener("dragover", (event) => event.preventDefault());
window.addEventListener("drop", (event) => {
  event.preventDefault();
  const paths = Array.from(event.dataTransfer.files)
    .map((file) => webUtils.getPathForFile(file))
    .filter(Boolean);
  if (paths.length) {
    ipcRenderer.send("begin-infall", {
      paths,
      clientX: event.clientX,
      clientY: event.clientY,
    });
  }
});

contextBridge.exposeInMainWorld("blackHoleHost", {
  startWindowDrag: (point) => ipcRenderer.send("window-drag-start", point),
  moveWindow: (point) => ipcRenderer.send("window-drag-move", point),
  endWindowDrag: () => ipcRenderer.send("window-drag-end"),
  onInfall: (callback) => ipcRenderer.on("begin-infall", (_event, payload) => callback(payload)),
  onRecycled: (callback) => ipcRenderer.on("recycle-complete", (_event, name) => callback(name)),
  onRecycleFailed: (callback) => ipcRenderer.on("recycle-failed", (_event, name) => callback(name)),
});
