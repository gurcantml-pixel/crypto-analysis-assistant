export const isDev = process.env.NODE_ENV === 'development';

export const API_ENDPOINTS = {
  BINANCE_TICKER: 'https://api.binance.com/api/v3/ticker/24hr',
  BINANCE_KLINES: 'https://api.binance.com/api/v3/klines',
  BINANCE_WS: 'wss://stream.binance.com:9443/ws',
  COINMARKETCAP_NEWS: 'https://api.coinmarketcap.com/data-api/v3/news/list',
} as const;

export const SUPPORTED_SYMBOLS = [
  'BTCUSDT',
  'ETHUSDT',
  'BNBUSDT',
  'ADAUSDT',
  'DOTUSDT',
  'XRPUSDT',
  'LTCUSDT',
  'LINKUSDT',
  'BCHUSDT',
  'XLMUSDT',
] as const;

export type SupportedSymbol = typeof SUPPORTED_SYMBOLS[number];

export const TIMEFRAMES = [
  { value: '1m', label: '1 Dakika' },
  { value: '5m', label: '5 Dakika' },
  { value: '15m', label: '15 Dakika' },
  { value: '1h', label: '1 Saat' },
  { value: '4h', label: '4 Saat' },
  { value: '1d', label: '1 Gün' },
] as const;