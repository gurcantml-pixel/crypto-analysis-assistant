/**
 * 🌐 Turkish Translation Service
 * Automatic news translation to Turkish
 * Professional crypto terminology preservation
 */

export interface TranslationResult {
  title: string;
  summary: string;
  content?: string;
  isTranslated: boolean;
  originalLanguage: string;
}

export interface TurkishNewsTerms {
  [key: string]: string;
}

class TurkishTranslationService {
  // Kripto terimleri sözlüğü - Türkçe karşılıklar
  private readonly cryptoTerms: TurkishNewsTerms = {
    // Temel terimler
    'bitcoin': 'Bitcoin',
    'ethereum': 'Ethereum',
    'cryptocurrency': 'kripto para',
    'crypto': 'kripto',
    'blockchain': 'blok zinciri',
    'wallet': 'cüzdan',
    'exchange': 'borsa',
    'trading': 'ticaret',
    'trader': 'yatırımcı',
    'hodl': 'uzun vadeli tutma',
    'mining': 'madencilik',
    'miner': 'madenci',
    'hash': 'hash',
    'hashrate': 'hash oranı',
    'market cap': 'piyasa değeri',
    'volume': 'hacim',
    'liquidity': 'likidite',
    
    // Teknik terimler
    'bull market': 'boğa piyasası',
    'bear market': 'ayı piyasası',
    'bullish': 'yükseliş beklentisi',
    'bearish': 'düşüş beklentisi',
    'pump': 'hızlı yükseliş',
    'dump': 'hızlı düşüş',
    'moon': 'çok yüksek seviye',
    'to the moon': 'zirveye',
    'diamond hands': 'güçlü eller',
    'paper hands': 'zayıf eller',
    'buy the dip': 'düşüşte al',
    'FOMO': 'kaçırma korkusu',
    'FUD': 'korku belirsizlik şüphe',
    
    // DeFi terimler
    'defi': 'merkeziyetsiz finans',
    'decentralized': 'merkeziyetsiz',
    'smart contract': 'akıllı kontrat',
    'yield farming': 'getiri çiftçiliği',
    'liquidity pool': 'likidite havuzu',
    'staking': 'stake etme',
    'unstaking': 'stake çözme',
    'governance': 'yönetişim',
    'dao': 'merkeziyetsiz otonom organizasyon',
    
    // NFT terimler
    'nft': 'NFT',
    'non-fungible token': 'değiştirilemez token',
    'collectible': 'koleksiyon eşyası',
    'opensea': 'OpenSea',
    'metaverse': 'metaverse',
    
    // Regülasyon
    'regulation': 'düzenleme',
    'regulatory': 'düzenleyici',
    'compliance': 'uyum',
    'sec': 'SEC',
    'cftc': 'CFTC',
    'government': 'hükümet',
    'ban': 'yasak',
    'legal': 'yasal',
    'illegal': 'yasadışı',
    
    // Piyasa terimleri
    'all-time high': 'tüm zamanların en yüksek seviyesi',
    'ath': 'ATH',
    'all-time low': 'tüm zamanların en düşük seviyesi',
    'atl': 'ATL',
    'resistance': 'direnç',
    'support': 'destek',
    'breakout': 'kırılım',
    'consolidation': 'konsolidasyon',
    'volatility': 'oynaklık',
    'market maker': 'piyasa yapıcısı',
    'market taker': 'piyasa alıcısı',
    
    // Genel finans
    'investment': 'yatırım',
    'investor': 'yatırımcı',
    'portfolio': 'portföy',
    'asset': 'varlık',
    'profit': 'kâr',
    'loss': 'zarar',
    'return': 'getiri',
    'risk': 'risk',
    'hedge': 'koruma',
    'diversification': 'çeşitlendirme'
  };

  // Yaygın İngilizce kelimeler ve Türkçe karşılıkları
  private readonly commonTranslations: TurkishNewsTerms = {
    // Zaman ifadeleri
    'ago': 'önce',
    'hour': 'saat',
    'hours': 'saat',
    'minute': 'dakika',
    'minutes': 'dakika',
    'day': 'gün',
    'days': 'gün',
    'week': 'hafta',
    'weeks': 'hafta',
    'month': 'ay',
    'months': 'ay',
    'year': 'yıl',
    'years': 'yıl',
    'today': 'bugün',
    'yesterday': 'dün',
    'tomorrow': 'yarın',
    
    // Eylemler
    'rise': 'yükseliş',
    'rises': 'yükseliyor',
    'rising': 'yükselen',
    'fall': 'düşüş',
    'falls': 'düşüyor',
    'falling': 'düşen',
    'surge': 'artış',
    'surging': 'artıyor',
    'crash': 'çöküş',
    'crashed': 'çöktü',
    'spike': 'sıçrama',
    'spiked': 'sıçradı',
    'jump': 'sıçrama',
    'jumped': 'sıçradı',
    'drop': 'düşüş',
    'dropped': 'düştü',
    'gain': 'kazanç',
    'gained': 'kazandı',
    'lose': 'kayıp',
    'lost': 'kaybetti',
    
    // Sıfatlar
    'high': 'yüksek',
    'higher': 'daha yüksek',
    'highest': 'en yüksek',
    'low': 'düşük',
    'lower': 'daha düşük',
    'lowest': 'en düşük',
    'new': 'yeni',
    'latest': 'en son',
    'recent': 'son',
    'major': 'büyük',
    'significant': 'önemli',
    'massive': 'büyük',
    'huge': 'devasa',
    'strong': 'güçlü',
    'weak': 'zayıf',
    
    // Genel kelimeler
    'news': 'haber',
    'update': 'güncelleme',
    'report': 'rapor',
    'analysis': 'analiz',
    'data': 'veri',
    'price': 'fiyat',
    'value': 'değer',
    'market': 'piyasa',
    'markets': 'piyasalar',
    'technology': 'teknoloji',
    'company': 'şirket',
    'platform': 'platform',
    'network': 'ağ',
    'protocol': 'protokol',
    'adoption': 'benimsenme',
    'integration': 'entegrasyon',
    'partnership': 'ortaklık',
    'launch': 'lansман',
    'announcement': 'duyuru',
    'development': 'geliştirme',
    'upgrade': 'yükseltme'
  };

  /**
   * 🇹🇷 Ana çeviri fonksiyonu
   */
  async translateNews(news: any): Promise<TranslationResult> {
    try {
      // Türkçe içerik tespiti
      if (this.isTurkish(news.title)) {
        return {
          title: news.title,
          summary: news.summary,
          content: news.content,
          isTranslated: false,
          originalLanguage: 'tr'
        };
      }

      // İngilizce'den Türkçe'ye çeviri
      const translatedTitle = this.translateText(news.title);
      const translatedSummary = this.translateText(news.summary);
      const translatedContent = news.content ? this.translateText(news.content) : undefined;

      return {
        title: translatedTitle,
        summary: translatedSummary,
        content: translatedContent,
        isTranslated: true,
        originalLanguage: 'en'
      };

    } catch (error) {
      console.error('❌ Translation error:', error);
      
      // Hata durumunda orijinal metni döndür
      return {
        title: news.title,
        summary: news.summary,
        content: news.content,
        isTranslated: false,
        originalLanguage: 'unknown'
      };
    }
  }

  /**
   * 📝 Metin çeviri işlemi
   */
  private translateText(text: string): string {
    if (!text) return text;

    let translatedText = text;

    // Kripto terimleri çevirisi (öncelikli)
    Object.entries(this.cryptoTerms).forEach(([english, turkish]) => {
      const regex = new RegExp(`\\b${english}\\b`, 'gi');
      translatedText = translatedText.replace(regex, turkish);
    });

    // Genel kelime çevirileri
    Object.entries(this.commonTranslations).forEach(([english, turkish]) => {
      const regex = new RegExp(`\\b${english}\\b`, 'gi');
      translatedText = translatedText.replace(regex, turkish);
    });

    // Sayı formatları
    translatedText = translatedText.replace(/\$([0-9,]+)/g, '$1 dolar');
    translatedText = translatedText.replace(/([0-9]+)%/g, '%$1');

    // Yaygın cümleler
    translatedText = translatedText
      .replace(/breaks? (new )?(all[- ]time )?high/gi, 'yeni zirve kırıyor')
      .replace(/hits? (new )?(all[- ]time )?high/gi, 'zirveye ulaşıyor')
      .replace(/reaches? (new )?(all[- ]time )?high/gi, 'zirveye çıkıyor')
      .replace(/institutional (adoption|interest)/gi, 'kurumsal benimsenme')
      .replace(/regulatory (clarity|framework)/gi, 'düzenleyici çerçeve')
      .replace(/market (confidence|sentiment)/gi, 'piyasa güveni')
      .replace(/price (target|prediction)/gi, 'fiyat hedefi')
      .replace(/technical analysis/gi, 'teknik analiz')
      .replace(/fundamental analysis/gi, 'temel analiz');

    return translatedText;
  }

  /**
   * 🔍 Türkçe içerik tespiti
   */
  private isTurkish(text: string): boolean {
    const turkishChars = /[çğıöşüÇĞIİÖŞÜ]/;
    const turkishWords = ['ve', 'ile', 'için', 'olan', 'bir', 'bu', 'şu', 'o', 'da', 'de', 'ki', 'mi', 'mu', 'mü'];
    
    // Türkçe karakterler var mı?
    if (turkishChars.test(text)) return true;

    // Türkçe kelimeler var mı?
    const words = text.toLowerCase().split(/\s+/);
    const turkishWordCount = words.filter(word => turkishWords.includes(word)).length;
    
    return turkishWordCount >= 2;
  }

  /**
   * 📊 Çeviri kalitesi değerlendirmesi
   */
  getTranslationQuality(original: string, translated: string): {
    score: number;
    improvements: string[];
  } {
    const improvements: string[] = [];
    let score = 100;

    // Çok fazla İngilizce kelime kaldıysa
    const englishWords = translated.match(/\b[a-zA-Z]{4,}\b/g) || [];
    if (englishWords.length > 5) {
      score -= 20;
      improvements.push('Daha fazla kelime çevrilebilir');
    }

    // Kripto terimleri doğru çevrilmiş mi?
    const cryptoTermsFound = Object.keys(this.cryptoTerms).filter(term => 
      original.toLowerCase().includes(term.toLowerCase())
    );
    const properlyTranslated = cryptoTermsFound.filter(term =>
      translated.toLowerCase().includes(this.cryptoTerms[term].toLowerCase())
    );

    if (properlyTranslated.length < cryptoTermsFound.length) {
      score -= 30;
      improvements.push('Kripto terimleri daha iyi çevrilebilir');
    }

    return { score, improvements };
  }
}

export const turkishTranslationService = new TurkishTranslationService();
export default turkishTranslationService;