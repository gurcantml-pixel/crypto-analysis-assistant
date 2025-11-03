import { contextBridge, ipcRenderer } from 'electron';

// Güvenli API bridge'i
contextBridge.exposeInMainWorld('electronAPI', {
  // Uygulama bilgileri
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  
  // Dialog işlemleri
  showMessageBox: (options: any) => ipcRenderer.invoke('show-message-box', options),
  
  // Platform bilgisi
  platform: process.platform,
  
  // Pencere kontrolü
  minimize: () => ipcRenderer.invoke('window-minimize'),
  maximize: () => ipcRenderer.invoke('window-maximize'),
  close: () => ipcRenderer.invoke('window-close'),
  
  // API Proxy - CORS sorunları için
  apiRequest: (url: string, options: any) => ipcRenderer.invoke('api-request', { url, options }),
  
  // Güvenli API Config Storage
  saveAPIConfig: (config: any) => ipcRenderer.invoke('save-api-config', config),
  loadAPIConfig: () => ipcRenderer.invoke('load-api-config'),
  deleteAPIConfig: () => ipcRenderer.invoke('delete-api-config'),
});

// TypeScript için global tür tanımları
declare global {
  interface Window {
    electronAPI: {
      getAppVersion: () => Promise<string>;
      showMessageBox: (options: any) => Promise<any>;
      platform: string;
      minimize: () => Promise<void>;
      maximize: () => Promise<void>;
      close: () => Promise<void>;
      apiRequest: (url: string, options: any) => Promise<any>;
      saveAPIConfig: (config: any) => Promise<boolean>;
      loadAPIConfig: () => Promise<any>;
      deleteAPIConfig: () => Promise<boolean>;
    };
  }
}