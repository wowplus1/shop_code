import React from 'react';
import { X, ExternalLink, ShoppingCart } from 'lucide-react';

export default function PriceModal({ isOpen, onClose, product }) {
  if (!product) return null;

  // 배송비 포맷팅 함수
  const formatShippingFee = (fee) => {
    if (fee === 0 || fee === '0') {
      return <span className="shipping-free">무료배송</span>;
    }
    return `배송비 ${Number(fee).toLocaleString()}원`;
  };

  return (
    <>
      {/* 백드롭 터치 시 닫기 */}
      <div 
        className={`half-modal-backdrop ${isOpen ? 'active' : ''}`} 
        onClick={onClose}
      />
      
      {/* 하프 모달 결과 팝업 */}
      <div className={`half-modal ${isOpen ? 'active' : ''}`}>
        <div className="modal-indicator" />
        
        <div className="modal-header">
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              최저가 비교 결과
            </span>
          </div>
          <button className="close-btn" onClick={onClose} aria-label="닫기">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {/* 상품 대표 이미지 */}
          <div className="product-thumbnail-wrapper">
            {product.image ? (
              <img 
                src={product.image} 
                alt={product.name} 
                className="product-thumbnail" 
                onError={(e) => {
                  e.target.onerror = null; 
                  e.target.src = "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=400";
                }}
              />
            ) : (
              <ShoppingCart size={32} color="var(--text-secondary)" />
            )}
          </div>

          {/* 상품 상세 정보 */}
          <div className="product-info-col">
            <h4 className="product-name" title={product.name}>
              {product.name}
            </h4>
            
            <div className="price-section">
              <div className="mall-info">
                {product.mallName || '온라인몰'} 최저가
              </div>
              <div className="price-main">
                {Number(product.lowPrice).toLocaleString()}
                <span className="price-currency">원</span>
              </div>
              <div className="shipping-fee">
                {formatShippingFee(product.shippingFee)}
              </div>
            </div>
          </div>
        </div>

        {/* 아웃링크 대형 버튼 */}
        <a 
          href={product.link} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="action-btn"
        >
          <span>온라인 최저가 보러가기</span>
          <ExternalLink size={16} />
        </a>
      </div>
    </>
  );
}
