# 🤝 Contributing to Kripto Analiz Asistanı

Katkıda bulunmak istediğiniz için teşekkürler! 🎉

## 🚀 Nasıl Katkıda Bulunulur

### 1. Fork & Clone
```bash
git clone https://github.com/YOUR_USERNAME/kripto-trading-app.git
cd kripto-trading-app
npm install
```

### 2. Branch Oluştur
```bash
git checkout -b feature/amazing-feature
```

### 3. Değişiklikleri Yap
- Kod standardlarına uy (ESLint + Prettier)
- TypeScript strict mode kullan
- Anlamlı commit mesajları yaz

### 4. Test Et
```bash
npm run lint
npm run build
npm run dev  # Test et
```

### 5. Pull Request Aç
- Detaylı açıklama yaz
- Screenshots ekle (UI değişiklikleri için)
- Related issues'a link ver

## 📋 Katkı Alanları

### 🐛 Bug Reports
- GitHub Issues kullan
- Detaylı repro steps
- Screenshots/logs ekle
- Beklenen vs gerçek davranış

### ✨ Feature Requests
- Use case açıkla
- Mockup/wireframe ekle (optional)
- ROADMAP.md'yi kontrol et (belki zaten planlanmış)

### 💻 Code Contributions
**Priority Areas**:
- Technical indicators (RSI, MACD, Bollinger Bands variants)
- UI/UX improvements
- Performance optimizations
- Documentation
- Tests

### 📚 Documentation
- README improvements
- Code comments
- Turkish → English translations
- Tutorial videos

## 🎨 Code Style

### TypeScript
```typescript
// ✅ Good
interface CoinData {
  symbol: string;
  price: number;
  change24h: number;
}

// ❌ Bad
interface coindata {
  s: string;
  p: any;
}
```

### React Components
```tsx
// ✅ Good - Functional component with TypeScript
export const CoinCard: React.FC<{ coin: Coin }> = ({ coin }) => {
  const [loading, setLoading] = useState(false);
  // ...
};

// ❌ Bad - Class component, no types
export class CoinCard extends Component {
  // ...
}
```

### Commit Messages
```
feat: Add divergence detection algorithm
fix: Resolve WebSocket reconnection issue
docs: Update API configuration guide
style: Format code with Prettier
refactor: Simplify cache management
test: Add unit tests for technical analysis
```

## 🧪 Testing Guidelines

### Unit Tests (Coming Soon)
```typescript
import { calculateRSI } from './technicalAnalysis';

describe('Technical Analysis', () => {
  it('should calculate RSI correctly', () => {
    const prices = [44, 44.34, 44.09, ...];
    const rsi = calculateRSI(prices, 14);
    expect(rsi).toBeCloseTo(70.46, 1);
  });
});
```

## 📝 API Guidelines

### Error Handling
```typescript
// ✅ Good
try {
  const data = await fetchCoinData(symbol);
  return data;
} catch (error) {
  console.error('Failed to fetch coin data:', error);
  toast.error('Veri yüklenemedi');
  return null;
}

// ❌ Bad
const data = await fetchCoinData(symbol); // No error handling
```

### Rate Limiting
```typescript
// ✅ Good - Respect cache
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
if (Date.now() - lastFetch < CACHE_DURATION) {
  return cachedData;
}

// ❌ Bad - Spam API
for (let i = 0; i < 100; i++) {
  await fetchData(); // Rate limit exceeded!
}
```

## 🔒 Security

**NEVER commit**:
- API keys
- Private keys
- Credentials
- config.json with real data

**Always**:
- Use environment variables
- Add sensitive files to .gitignore
- Review git diff before commit

## 🏆 Recognition

Contributors will be:
- Added to README.md
- Mentioned in release notes
- Invited to Discord VIP channel (when available)

## 📞 Questions?

- Open a GitHub Discussion
- Join Discord (coming soon)
- Email: [Your email here]

## 📜 Code of Conduct

- Be respectful
- Be constructive
- Be inclusive
- Help newcomers

---

**Thank you for making Kripto Analiz Asistanı better! 🚀**
