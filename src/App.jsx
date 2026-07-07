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
    useMock: false, // 기본적으로 Mock 모드가 아닌 실시간 API 모드로 시작
    clientId: '3GZMhpS_2U1c6HhGMeWk',
    clientSecret: 'rv0kU8KUOX'
  });

  // 컴포넌트 마운트 시 localStorage에서 설정 불러오기
  useEffect(() => {
    const savedId = localStorage.getItem('naver_client_id') || '3GZMhpS_2U1c6HhGMeWk';
    const savedSecret = localStorage.getItem('naver_client_secret') || 'rv0kU8KUOX';
    // 로컬 스토리지에 use_mock_data가 특별히 'true'로 저장된 적이 없는 한 기본값은 false(API 모드)
    const savedMode = localStorage.getItem('use_mock_data') === 'true';

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
      // (네이버 쇼핑 검색결과 페이지의 HTML을 스크래핑하여 실시간 최저가 데이터를 직접 파싱합니다)
      const queryStr = productData ? productData.name : barcode;
      try {
        const targetUrl = `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(queryStr)}`;
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;

        const response = await fetch(proxyUrl);

        if (!response.ok) {
          throw new Error('HTML 스크래핑 실패 via CORS proxy');
        }

        const html = await response.text();
        let apiProduct = null;

        // 1순위 파싱: NEXT_DATA JSON 파싱 시도 (가장 상세하고 정확함)
        const jsonMatch = html.match(/<script id="__NEXT_DATA__" type="application/json">([\s\S]*?)<\/script>/);
        if (jsonMatch) {
          try {
            const data = JSON.parse(jsonMatch[1]);
            const productsList = data.props?.pageProps?.initialState?.products?.list || [];
            
            if (productsList.length > 0) {
              const firstItem = productsList[0].item;
              apiProduct = {
                barcode: barcode,
                name: firstItem.productName || firstItem.productTitle || "",
                image: firstItem.imageUrl,
                lowPrice: parseInt(firstItem.lowPrice) || 0,
                shippingFee: parseInt(firstItem.deliveryFee) || 0,
                mallName: firstItem.mallName || "네이버쇼핑",
                link: firstItem.adcrUrl || `https://search.shopping.naver.com/catalog/${firstItem.id}`
              };
            }
          } catch (jsonErr) {
            console.error("NEXT_DATA JSON 파싱 에러:", jsonErr);
          }
        }

        // 2순위 파싱: window.__PRELOADED_STATE__ 파싱 시도 (폴백)
        if (!apiProduct) {
          const preloadedMatch = html.match(/window\.__PRELOADED_STATE__\s*=\s*(\{[\s\S]*?\});\s*<\/script>/);
          if (preloadedMatch) {
            try {
              const data = JSON.parse(preloadedMatch[1]);
              const list = data.catalog?.products?.list || data.search?.products?.list || [];
              if (list.length > 0) {
                const first = list[0];
                apiProduct = {
                  barcode: barcode,
                  name: first.productName || first.productTitle || "",
                  image: first.imageUrl || first.thumbnail || "",
                  lowPrice: parseInt(first.lowPrice) || 0,
                  shippingFee: parseInt(first.deliveryFee) || 0,
                  mallName: first.mallName || "네이버쇼핑",
                  link: `https://search.shopping.naver.com/catalog/${first.id}`
                };
              }
            } catch (err) {
              console.error("PRELOADED_STATE 파싱 에러:", err);
            }
          }
        }

        // 3순위 파싱 (최종 폴백): 정규식을 통한 HTML 패턴 직접 매칭
        if (!apiProduct) {
          const priceMatch = html.match(/<span>최저\s*<\/span>\s*<span[^>]*>([\d,]+)원/i) || html.match(/class="[a-zA-Z0-9_-]*price_num[a-zA-Z0-9_-]*"[^>]*>([\d,]+)원/);
          const titleMatch = html.match(/class="[a-zA-Z0-9_-]*product_title[a-zA-Z0-9_-]*"[^>]*><a[^>]*title="([^"]+)"/i) || html.match(/class="[a-zA-Z0-9_-]*product_link[a-zA-Z0-9_-]*"[^>]*>([^<]+)<\/a>/);
          const imgMatch = html.match(/class="[a-zA-Z0-9_-]*thumbnail_image[a-zA-Z0-9_-]*"[^>]*src="([^"]+)"/i) || html.match(/<img[^>]*src="([^"]+)"[^>]*class="[a-zA-Z0-9_-]*thumbnail/);

          if (priceMatch) {
            apiProduct = {
              barcode: barcode,
              name: titleMatch ? titleMatch[1].replace(/<[^>]*>?/g, '') : (productData ? productData.name : `검색 상품 (${barcode})`),
              image: imgMatch ? imgMatch[1] : "",
              lowPrice: parseInt(priceMatch[1].replace(/,/g, '')) || 0,
              shippingFee: 3000,
              mallName: "네이버쇼핑",
              link: `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(queryStr)}`
            };
          }
        }

        if (apiProduct) {
          // 배송비 포맷 및 데이터 가공
          apiProduct.shippingFee = apiProduct.lowPrice < 30000 && apiProduct.shippingFee === 0 ? 3000 : apiProduct.shippingFee;
          setScannedProduct(apiProduct);
        } else {
          // 매칭 정보가 전혀 없는 경우
          setScannedProduct(productData || {
            barcode: barcode,
            name: `온라인 미등록 바코드 (${barcode})`,
            image: "",
            lowPrice: 0,
            shippingFee: 0,
            mallName: "미등록",
            link: `https://search.shopping.naver.com/search/all?query=${barcode}`
          });
        }
        setIsPriceOpen(true);
      } catch (err) {
        console.error("Scraping Fetch Error, falling back to mock: ", err);
        setScannedProduct(productData || {
          barcode: barcode,
          name: `임시 검색 바코드 (${barcode})`,
          image: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=400",
          lowPrice: 4500,
          shippingFee: 3000,
          mallName: "임시",
          link: `https://search.shopping.naver.com/search/all?query=${barcode}`
        });
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
