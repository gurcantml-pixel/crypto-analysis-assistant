import { app, BrowserWindow, Menu, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { isDev } from './utils';
import https from 'https';

let mainWindow: BrowserWindow | null = null;

function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    show: false,
    titleBarStyle: 'default',
    icon: path.join(__dirname, '../../assets/icon.png'),
  });

  // Pencere hazır olduğunda göster
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    
    if (isDev) {
      mainWindow?.webContents.openDevTools();
    }
  });

  // F12 ile Developer Tools açma kısayolu
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12') {
      mainWindow?.webContents.toggleDevTools();
    }
  });

  // Uygulama URL'ini yükle
  const url = isDev 
    ? 'http://localhost:5173' 
    : `file://${path.join(__dirname, '../renderer/index.html')}`;
    
  mainWindow.loadURL(url);

  // Pencere kapatıldığında
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Uygulama hazır olduğunda
app.whenReady().then(() => {
  createMainWindow();
  
  // macOS için dock icon tıklaması
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

// Tüm pencereler kapatıldığında
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Menu ayarları
if (isDev) {
  Menu.setApplicationMenu(null);
} else {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'Dosya',
      submenu: [
        {
          label: 'Çıkış',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Görünüm',
      submenu: [
        {
          label: 'Yeniden Yükle',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            mainWindow?.reload();
          }
        },
        {
          label: 'Tam Ekran',
          accelerator: process.platform === 'darwin' ? 'Ctrl+Command+F' : 'F11',
          click: () => {
            if (mainWindow) {
              mainWindow.setFullScreen(!mainWindow.isFullScreen());
            }
          }
        }
      ]
    },
    {
      label: 'Yardım',
      submenu: [
        {
          label: 'Hakkında',
          click: () => {
            dialog.showMessageBox(mainWindow!, {
              type: 'info',
              title: 'Hakkında',
              message: 'Kripto Trading Asistanı',
              detail: 'Modern kripto trading analizi ve sinyal üretimi uygulaması\nVersiyon: 1.0.0'
            });
          }
        }
      ]
    }
  ];
  
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// IPC Handler'ları
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('show-message-box', async (_, options) => {
  if (mainWindow) {
    const result = await dialog.showMessageBox(mainWindow, options);
    return result;
  }
  return null;
});

// API Proxy Handler - CORS sorunlarını çözmek için (TradingView + Diğer API'ler)
ipcMain.handle('api-request', async (_, { url, options }) => {
  try {
    console.log('🔄 API Proxy Request:', url);
    
    // TradingView için özel headers
    if (url.includes('tradingview.com')) {
      options = {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Origin': 'https://www.tradingview.com',
          'Referer': 'https://www.tradingview.com/',
          'Accept': 'application/json, text/javascript, */*; q=0.01',
          'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'same-origin',
          ...options.headers
        }
      };
    }
    
    // CoinGecko için rate limit koruması
    if (url.includes('coingecko.com')) {
      options = {
        ...options,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'KriptoAnalizAsistani/1.0',
          ...options.headers
        }
      };
    }
    
    // Binance için headers
    if (url.includes('binance.com')) {
      options = {
        ...options,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; KriptoApp/1.0)',
          ...options.headers
        }
      };
    }
    
    const response = await fetch(url, options);
    
    // Response kontrolü
    if (!response.ok) {
      console.warn(`⚠️ API Response Warning: ${response.status} ${response.statusText} for ${url}`);
    }
    
    const data = await response.json();
    
    console.log(`✅ API Proxy Success: ${url} (${response.status})`);
    
    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      data
    };
  } catch (error) {
    console.error('❌ API Proxy Error:', url, error);
    throw error;
  }
});

// Güvenli API Config Storage
const ENCRYPTION_KEY = 'kripto-trading-app-secret-key-2024'; // 32 karakter
const CONFIG_FILE = path.join(app.getPath('userData'), 'api-config.enc');

function encrypt(text: string): string {
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const iv = crypto.randomBytes(16);
  
  const cipher = crypto.createCipher(algorithm, key);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(encryptedText: string): string {
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  
  const parts = encryptedText.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  
  const decipher = crypto.createDecipher(algorithm, key);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

// API Config kaydetme
ipcMain.handle('save-api-config', async (_, config) => {
  try {
    const encryptedConfig = encrypt(JSON.stringify(config));
    fs.writeFileSync(CONFIG_FILE, encryptedConfig, 'utf8');
    console.log('✅ API Config saved securely');
    return true;
  } catch (error) {
    console.error('❌ Error saving API config:', error);
    return false;
  }
});

// API Config yükleme
ipcMain.handle('load-api-config', async () => {
  try {
    if (!fs.existsSync(CONFIG_FILE)) {
      return null;
    }
    
    const encryptedConfig = fs.readFileSync(CONFIG_FILE, 'utf8');
    const decryptedConfig = decrypt(encryptedConfig);
    const config = JSON.parse(decryptedConfig);
    
    console.log('✅ API Config loaded securely');
    return config;
  } catch (error) {
    console.error('❌ Error loading API config:', error);
    return null;
  }
});

// API Config silme
ipcMain.handle('delete-api-config', async () => {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      fs.unlinkSync(CONFIG_FILE);
      console.log('✅ API Config deleted');
    }
    return true;
  } catch (error) {
    console.error('❌ Error deleting API config:', error);
    return false;
  }
});