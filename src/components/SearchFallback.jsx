import React, { useState } from 'react';
import { Search, X, ShoppingBag, AlertCircle } from 'lucide-react';
import { mockProducts } from '../utils/mockData';

export default function SearchFallback({ isOpen, onClose, onSelectProduct, settings }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setSearched(true);

    if (settings.useMock) {
      // Mock 데이터에서 키워드 부분 검색
      const filtered = Object.values(mockProducts).filter(product => 
        product.name.toLowerCase().includes(query.toLowerCase())
      );
      setResults(filtered);
      setLoading(false);
    } else {
      // 네이버 쇼핑 API 모드
      try {
        const targetUrl = `https://openapi.naver.com/v1/search/shop.json?query=${encodeURIComponent(query.trim())}&display=5`;
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
        
        const response = await fetch(proxyUrl, {
          headers: {
            'X-Naver-Client-Id': settings.clientId,
            'X-Naver-Client-Secret': settings.clientSecret
          }
        });

        if (!response.ok) {
          throw new Error('Naver API request failed');
        }

        const data = await response.json();
        // 네이버 반환 형식을 앱 스펙에 맞게 파싱
        const parsedResults = (data.items || []).map(item => ({
          barcode: '',
          name: item.title.replace(/<[^>]*>?/g, ''), // HTML 태그 제거
          image: item.image,
          lowPrice: parseInt(item.lprice) || 0,
          shippingFee: parseInt(item.hprice) || 0, // 네이버 API에서 배송비는 간접 유추하거나 별도 계산, 기본 3000원 처리 혹은 없으면 0원
          mallName: item.mallName,
          link: item.link
        }));

        // 임의의 배송비 매칭 (네이버 쇼핑 API는 lprice 필드 외 배송비 조회가 다소 부정확할 수 있으므로 기본값 설정)
        parsedResults.forEach(item => {
          item.shippingFee = item.lowPrice < 30000 ? 3000 : 0; // 3만원 미만 시 배송비 3000원 부여 시뮬레이션
        });

        setResults(parsedResults);
      } catch (err) {
        console.error("Search API Error: ", err);
        // 에러 발생 시 Mock 검색으로 폴백 처리
        const filtered = Object.values(mockProducts).filter(product => 
          product.name.toLowerCase().includes(query.toLowerCase())
        );
        setResults(filtered);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSelect = (product) => {
    onSelectProduct(product);
    onClose();
  };

  return (
    <div className={`full-modal-backdrop ${isOpen ? 'active' : ''}`} onClick={onClose}>
      <div className="modal-content-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="card-title" style={{ color: 'var(--text-primary)' }}>
            <Search size={20} />
            수동 상품명 검색
          </h3>
          <button className="close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* 예외 안내 공지 */}
        <div style={{
          display: 'flex',
          gap: '10px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: '12px',
          padding: '12px',
          marginBottom: '16px'
        }}>
          <AlertCircle size={20} color="var(--accent-color)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <p style={{ fontSize: '0.8rem', color: 'var(--text-primary)', lineHeight: '1.4' }}>
            온라인 미출시 혹은 마트 전용 기획 상품(PB 등)은 바코드 검색이 불가능할 수 있습니다. <strong>상품명으로 직접 재검색</strong>해보세요.
          </p>
        </div>

        {/* 검색 폼 */}
        <form onSubmit={handleSearch} className="form-group" style={{ flexDirection: 'row', gap: '8px', marginBottom: '16px' }}>
          <input
            type="text"
            className="form-input"
            placeholder="상품명을 입력하세요 (예: 신라면)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ flex: 1 }}
          />
          <button type="submit" className="btn-primary" style={{ padding: '12px 18px', width: 'auto', flex: 'none', borderRadius: '12px' }}>
            <Search size={18} />
          </button>
        </form>

        {/* 검색 결과 리스트 */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
            최저가를 찾는 중...
          </div>
        ) : (
          <>
            {searched && results.length === 0 && (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                검색 결과가 없습니다. 다른 검색어를 입력해 보세요.
              </div>
            )}
            
            {results.length > 0 && (
              <div>
                <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>온라인 최저가 매칭 리스트</label>
                <div className="search-results-list">
                  {results.map((product, idx) => (
                    <div 
                      key={idx} 
                      className="search-item" 
                      onClick={() => handleSelect(product)}
                    >
                      <img 
                        src={product.image || "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=100"} 
                        alt={product.name} 
                        className="search-item-img"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=100";
                        }}
                      />
                      <div className="search-item-info">
                        <div className="search-item-name">{product.name}</div>
                        <div className="search-item-price">
                          {product.lowPrice.toLocaleString()}원
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 'normal', marginLeft: '6px' }}>
                            ({product.mallName})
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
