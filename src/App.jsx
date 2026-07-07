import React, { useState, useEffect } from 'react';
import BarcodeScanner from './components/BarcodeScanner';
import PriceModal from './components/PriceModal';
import SettingsModal from './components/SettingsModal';
import SearchFallback from './components/SearchFallback';
import { findMockProduct } from './utils/mockData';
import { Settings, Search, ScanLine, HelpCircle } from 'lucide-react';

export default function App() {
  const [scannedProduct, setScannedProduct] = useState(null);
  const [isScannerPaused, setIsScannerPaused] = useState(false);
  
  // 모달 상태 관리
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isPriceOpen, setIsPriceOpen] = useState(false);

  // 시스템 설정 상태
  const [settings, setSettings] = useState({
    useMock: true,
    clientId: '',
    clientSecret: ''
  });

  // 컴포넌트 마운트 시 localStorage에서 설정 불러오기
  useEffect(() => {
    const savedId = localStorage.getItem('naver_client_id') || '';
    const savedSecret = localStorage.getItem('naver_client_secret') || '';
    const savedMode = localStorage.getItem('use_mock_data') !== 'false';

    setSettings({
      useMock: savedMode,
      clientId: savedId,
      clientSecret: savedSecret
    });
  }, []);

  // 설정 저장 핸들러
  const handleSaveSettings = (newSettings) => {
    setSettings(newSettings);
  };

  // 바코드 스캔 성공 핸들러
  const handleScanSuccess = async (barcode) => {
    console.log("Scanned Barcode: ", barcode);
    setIsScannerPaused(true); // 스캔 성공 시 추가 스캔 방지를 위해 즉시 스패너 일시정지

    // 1. Mock 데이터베이스에서 먼저 검색
    const productData = findMockProduct(barcode);

    if (!productData) {
      // 바코드가 DB에 없는 경우 (PB 상품 또는 인식 에러) -> 수동 검색창 팝업 유도
      alert("바코드 정보를 조회할 수 없습니다. 수동 상품명 검색으로 전환합니다.");
      setIsSearchOpen(true);
      return;
    }

    // 2. Mock 모드일 경우 바로 바인딩
    if (settings.useMock) {
      setScannedProduct(productData);
      setIsPriceOpen(true);
    } else {
      // API 모드일 경우: 해당 상품명을 기반으로 네이버 쇼핑에서 실시간 최저가 조회
      try {
        const url = `/api/naver/v1/search/shop.json?query=${encodeURIComponent(productData.name)}&display=1`;
        const response = await fetch(url, {
          headers: {
            'X-Naver-Client-Id': settings.clientId,
            'X-Naver-Client-Secret': settings.clientSecret,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('API Request failed');
        }

        const data = await response.json();
        if (data.items && data.items.length > 0) {
          const item = data.items[0];
          const apiProduct = {
            barcode: barcode,
            name: item.title.replace(/<[^>]*>?/g, ''), // HTML 태그 제거
            image: item.image,
            lowPrice: parseInt(item.lprice) || 0,
            shippingFee: parseInt(item.hprice) || 0,
            mallName: item.mallName,
            link: item.link
          };
          
          // 배송비 계산 시뮬레이션
          apiProduct.shippingFee = apiProduct.lowPrice < 30000 ? 3000 : 0;

          setScannedProduct(apiProduct);
        } else {
          // 검색 결과가 없는 경우 Mock 데이터로 폴백
          setScannedProduct(productData);
        }
        setIsPriceOpen(true);
      } catch (err) {
        console.error("API Fetch Error, falling back to mock: ", err);
        // API 호출 에러 시 Mock 데이터 제공
        setScannedProduct(productData);
        setIsPriceOpen(true);
      }
    }
  };

  // 수동 검색 상품 선택 핸들러
  const handleSelectProduct = (product) => {
    setScannedProduct(product);
    setIsScannerPaused(true);
    setIsPriceOpen(true);
  };

  // 결과 창 닫고 스캔 재개 핸들러
  const handleClosePriceModal = () => {
    setIsPriceOpen(false);
    setScannedProduct(null);
    // 모달 애니메이션이 끝난 후 스캔을 재개할 수 있도록 지연 처리
    setTimeout(() => {
      setIsScannerPaused(false);
    }, 350);
  };

  // 수동 검색 모달 닫기 핸들러
  const handleCloseSearchModal = () => {
    setIsSearchOpen(false);
    // 결과 모달이 켜져있지 않다면 스캔 재개
    if (!isPriceOpen) {
      setIsScannerPaused(false);
    }
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* 상단 헤더 영역 */}
      <header className="header-bar">
        <h1 className="app-title">
          <ScanLine size={24} color="var(--accent-color)" />
          마트 최저가 스캐너
          <span className={`settings-badge ${settings.useMock ? 'badge-mock' : 'badge-api'}`}>
            {settings.useMock ? 'Mock' : 'API'}
          </span>
        </h1>
        <div className="header-actions">
          {/* 수동 검색 버튼 */}
          <button 
            className="icon-btn" 
            onClick={() => {
              setIsScannerPaused(true);
              setIsSearchOpen(true);
            }}
            title="수동 검색"
          >
            <Search size={18} />
          </button>
          
          {/* 설정 버튼 */}
          <button 
            className="icon-btn" 
            onClick={() => {
              setIsScannerPaused(true);
              setIsSettingsOpen(true);
            }}
            title="설정"
          >
            <Settings size={18} />
          </button>
        </div>
      </header>

      {/* 실시간 바코드 스캐너 엔진 */}
      <BarcodeScanner 
        onScan={handleScanSuccess} 
        isPaused={isScannerPaused} 
      />

      {/* 하프 모달 최저가 결과 팝업 */}
      <PriceModal 
        isOpen={isPriceOpen} 
        onClose={handleClosePriceModal} 
        product={scannedProduct} 
      />

      {/* API 설정 창 */}
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => {
          setIsSettingsOpen(false);
          if (!isPriceOpen && !isSearchOpen) setIsScannerPaused(false);
        }} 
        onSaveSettings={handleSaveSettings}
      />

      {/* 수동 검색 창 (PB 상품 등 대응) */}
      <SearchFallback 
        isOpen={isSearchOpen} 
        onClose={handleCloseSearchModal} 
        onSelectProduct={handleSelectProduct}
        settings={settings}
      />
    </div>
  );
}
