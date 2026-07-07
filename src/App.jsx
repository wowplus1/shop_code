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
    let productData = findMockProduct(barcode);

    // 2. Mock 모드일 경우 바로 바인딩 (Mock에 없는 바코드는 가상 데이터 자동 생성)
    if (settings.useMock) {
      if (!productData) {
        productData = {
          barcode: barcode,
          name: `바코드 상품 (번호: ${barcode})`,
          image: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=400",
          lowPrice: 5800,
          shippingFee: 3000,
          mallName: "시뮬레이터 몰",
          link: `https://search.shopping.naver.com/search/all?query=${barcode}`
        };
      }
      setScannedProduct(productData);
      setIsPriceOpen(true);
    } else {
      // 3. API 모드일 경우: 해당 상품명 혹은 바코드 번호를 검색어로 실시간 네이버 최저가 조회
      const queryStr = productData ? productData.name : barcode;
      try {
        const url = `/api/naver/v1/search/shop.json?query=${encodeURIComponent(queryStr)}&display=1`;
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
          
          apiProduct.shippingFee = apiProduct.lowPrice < 30000 ? 3000 : 0;
          setScannedProduct(apiProduct);
        } else {
          // 네이버에도 검색 결과가 없는 경우
          if (productData) {
            setScannedProduct(productData);
          } else {
            setScannedProduct({
              barcode: barcode,
              name: `온라인 미등록 바코드 (${barcode})`,
              image: "",
              lowPrice: 0,
              shippingFee: 0,
              mallName: "미등록",
              link: `https://search.shopping.naver.com/search/all?query=${barcode}`
            });
          }
        }
        setIsPriceOpen(true);
      } catch (err) {
        console.error("API Fetch Error, falling back: ", err);
        if (productData) {
          setScannedProduct(productData);
        } else {
          setScannedProduct({
            barcode: barcode,
            name: `임시 검색 바코드 (${barcode})`,
            image: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=400",
            lowPrice: 4500,
            shippingFee: 3000,
            mallName: "임시",
            link: `https://search.shopping.naver.com/search/all?query=${barcode}`
          });
        }
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
        onOpenSearch={() => {
          setIsScannerPaused(true);
          setIsSearchOpen(true);
        }}
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
