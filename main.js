const { app, BrowserWindow, ipcMain, Menu, screen, shell } = require("electron");
const path = require("node:path");

let blackHoleWindow;
let windowDrag;
let nextInfallId = 0;
const pendingInfalls = new Map();
const hasSingleInstanceLock = app.requestSingleInstanceLock();

if (!hasSingleInstanceLock) {
  app.quit();
}

function createWindow() {
  const display = screen.getPrimaryDisplay().workArea;
  blackHoleWindow = new BrowserWindow({
    width: 250,
    height: 157,
    x: display.x + display.width - 274,
    y: display.y + display.height - 205,
    frame: false,
    transparent: true,
    resizable: false,
    movable: true,
    hasShadow: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    backgroundColor: "#00000000",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  blackHoleWindow.setAlwaysOnTop(true, "screen-saver");
  blackHoleWindow.webContents.on("context-menu", () => {
    const menu = Menu.buildFromTemplate([
      { label: "退出黑洞回收站", click: () => app.quit() },
    ]);
    menu.popup({ window: blackHoleWindow });
  });
  blackHoleWindow.webContents.on("console-message", (_event, level, message, line, sourceId) => {
    console.log(`[renderer:${level}] ${sourceId}:${line} ${message}`);
  });
  blackHoleWindow.webContents.on("did-fail-load", (_event, code, description, url) => {
    console.error(`Could not load ${url}: ${code} ${description}`);
  });
  blackHoleWindow.loadFile(path.join(__dirname, "index.html"));
}

function canRecycle(filePath) {
  const parsed = path.parse(filePath);
  return Boolean(filePath) && path.resolve(filePath) !== parsed.root;
}

app.whenReady().then(() => {
  if (!hasSingleInstanceLock) return;
  createWindow();

  ipcMain.on("window-drag-start", (_event, point) => {
    if (!blackHoleWindow) return;
    const [x, y] = blackHoleWindow.getPosition();
    windowDrag = { originX: x, originY: y, pointerX: point.x, pointerY: point.y };
  });

  ipcMain.on("window-drag-move", (_event, point) => {
    if (!blackHoleWindow || !windowDrag) return;
    blackHoleWindow.setPosition(
      Math.round(windowDrag.originX + point.x - windowDrag.pointerX),
      Math.round(windowDrag.originY + point.y - windowDrag.pointerY),
    );
  });

  ipcMain.on("window-drag-end", () => {
    windowDrag = undefined;
  });

  ipcMain.on("begin-infall", (event, payload) => {
    const paths = [...new Set(payload?.paths || [])].filter(canRecycle);
    if (!paths.length) return;
    const id = ++nextInfallId;
    pendingInfalls.set(id, { paths, sender: event.sender });
    event.sender.send("begin-infall", {
      id,
      names: paths.map((filePath) => path.basename(filePath)),
      clientX: Number(payload?.clientX) || 0,
      clientY: Number(payload?.clientY) || 0,
    });
  });

  ipcMain.on("infall-complete", async (event, id) => {
    const pending = pendingInfalls.get(id);
    if (!pending || pending.sender.id !== event.sender.id) return;
    pendingInfalls.delete(id);
    for (const filePath of pending.paths) {
      try {
        await shell.trashItem(filePath);
        event.sender.send("recycle-complete", path.basename(filePath));
      } catch (error) {
        event.sender.send("recycle-failed", path.basename(filePath));
        console.error("Could not recycle dropped file", error);
      }
    }
  });
});

app.on("second-instance", () => {
  if (!blackHoleWindow) return;
  blackHoleWindow.showInactive();
  blackHoleWindow.setAlwaysOnTop(true, "screen-saver");
});

app.on("window-all-closed", () => app.quit());
