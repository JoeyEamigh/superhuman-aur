// Superhuman Linux - Self-initializing Tray Module with Account Switcher
const { app, Tray, Menu, nativeImage, ipcMain, BrowserWindow } = require('electron');
const path = require('path');

let tray = null;
let mainWindow = null;
let isQuitting = false;
let knownAccounts = new Map();

function getIconPath() {
    const possiblePaths = [
        path.join(__dirname, 'icon.png'),
        path.join(__dirname, '..', 'icon.png'),
        '/usr/share/icons/hicolor/256x256/apps/superhuman.png',
        '/opt/superhuman/superhuman.png',
    ];
    for (const iconPath of possiblePaths) {
        try {
            if (require('fs').existsSync(iconPath)) {
                return iconPath;
            }
        } catch (e) {}
    }
    return null;
}

function rebuildTrayMenu() {
    if (!tray) return;
    const menuItems = [];

    menuItems.push({
        label: mainWindow && mainWindow.isVisible() ? 'Hide Superhuman' : 'Show Superhuman',
        click: () => {
            if (mainWindow) {
                if (mainWindow.isVisible()) {
                    mainWindow.hide();
                } else {
                    mainWindow.show();
                    mainWindow.focus();
                }
                rebuildTrayMenu();
            }
        }
    });

    menuItems.push({ type: 'separator' });

    if (knownAccounts.size > 0) {
        menuItems.push({ label: 'Accounts', enabled: false });
        for (const [email] of knownAccounts) {
            menuItems.push({
                label: '  ' + email,
                click: () => { switchToAccount(email); }
            });
        }
        menuItems.push({ type: 'separator' });
    }

    menuItems.push({
        label: 'New Window',
        click: () => { createNewWindow(); }
    });

    menuItems.push({ type: 'separator' });

    menuItems.push({
        label: 'Quit Superhuman',
        click: () => {
            isQuitting = true;
            app.quit();
        }
    });

    tray.setContextMenu(Menu.buildFromTemplate(menuItems));
}

function switchToAccount(email) {
    if (global.main && typeof global.main.bestTabForEmail === 'function') {
        const { foundWindow, foundTab } = global.main.bestTabForEmail(email);
        if (foundWindow && foundTab) {
            foundWindow.show();
            foundWindow.focus();
            foundWindow.switchTab(foundTab);
            return;
        }
    }
    if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
    }
}

function createNewWindow() {
    if (global.main && typeof global.main.createWindow === 'function') {
        global.main.createWindow({});
    } else if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
    }
}

function createTray() {
    if (tray) return;

    const iconPath = getIconPath();
    let icon;

    if (iconPath) {
        icon = nativeImage.createFromPath(iconPath);
        icon = icon.resize({ width: 22, height: 22 });
    } else {
        icon = nativeImage.createEmpty();
    }

    tray = new Tray(icon);
    tray.setToolTip('Superhuman');
    rebuildTrayMenu();

    tray.on('click', () => {
        if (mainWindow) {
            if (mainWindow.isVisible()) {
                mainWindow.hide();
            } else {
                mainWindow.show();
                mainWindow.focus();
            }
            rebuildTrayMenu();
        }
    });
}

function setupWindowCloseToTray(window) {
    if (!mainWindow) {
        mainWindow = window;
    }

    window.on('close', (event) => {
        if (!isQuitting) {
            event.preventDefault();
            window.hide();
            rebuildTrayMenu();
            return false;
        }
        return true;
    });

    window.on('show', () => { rebuildTrayMenu(); });
    window.on('hide', () => { rebuildTrayMenu(); });
}

function setupAccountTracking() {
    const originalEmit = ipcMain.emit.bind(ipcMain);
    ipcMain.emit = function(channel, event, ...args) {
        if (channel === 'SH_SET_ACCOUNT' && args[0] && args[0].emailAddress) {
            knownAccounts.set(args[0].emailAddress, {
                emailAddress: args[0].emailAddress,
                accountColor: args[0].accountColor,
                theme: args[0].theme
            });
            rebuildTrayMenu();
        }
        return originalEmit(channel, event, ...args);
    };

    setTimeout(() => {
        if (global.main && global.main.windows) {
            for (const win of global.main.windows) {
                if (win.accounts) {
                    for (const [email, account] of Object.entries(win.accounts)) {
                        knownAccounts.set(email, account);
                    }
                }
            }
            rebuildTrayMenu();
        }
    }, 3000);
}

// Self-initialization: set up tray when app is ready
function init() {
    createTray();
    setupAccountTracking();

    // Capture all windows and set up close-to-tray
    app.on('browser-window-created', (event, window) => {
        if (!mainWindow) {
            mainWindow = window;
        }
        setupWindowCloseToTray(window);
    });

    // Also capture any existing windows
    const existingWindows = BrowserWindow.getAllWindows();
    for (const window of existingWindows) {
        if (!mainWindow) {
            mainWindow = window;
        }
        setupWindowCloseToTray(window);
    }
}

app.on('before-quit', () => { isQuitting = true; });
app.on('activate', () => { if (mainWindow) mainWindow.show(); });

// Initialize when app is ready, or immediately if already ready
if (app.isReady()) {
    init();
} else {
    app.whenReady().then(init);
}

module.exports = {
    createTray,
    setupWindowCloseToTray,
    setQuitting: (val) => { isQuitting = val; },
    rebuildTrayMenu
};
