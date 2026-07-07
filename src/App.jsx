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
    // 최초 모바일 테스트 편의를 위해, 강제로 Mock 모드를 끄고 실시간 API 스크래핑 모드로 셋업 (1회 강제 리셋)
    const currentMock = localStorage.getItem('use_mock_data');
    if (currentMock === null || currentMock === 'true') {
      localStorage.setItem('use_mock_data', 'false');
    }

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
      // 3. API 스크래핑 모드일 경우: 2단계 하이브리드 검색 파이프라인 가동
      // (1단계: 바코드로 네이버 쇼핑을 조회해 실제 상품명/이미지를 먼저 획득 -> 2단계: 그 상품명으로 다시 검색하여 최적의 최저가 리스트 파싱)
      let queryStr = productData ? productData.name : barcode;
      try {
        // --- 1단계: 상품명(한글 키워드) 알아내기 ---
        const firstTargetUrl = `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(queryStr)}`;
        const firstProxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(firstTargetUrl)}`;
        const firstResponse = await fetch(firstProxyUrl);

        if (!firstResponse.ok) {
          throw new Error('1차 상품명 획득 실패');
        }

        const firstHtml = await firstResponse.text();
        let foundProductName = "";
        let foundImage = "";

        // NEXT_DATA 파싱하여 상품명 추출 시도
        const firstJsonMatch = firstHtml.match(/<script id="__NEXT_DATA__" type="application/json">([\s\S]*?)<\/script>/);
        if (firstJsonMatch) {
          try {
            const data = JSON.parse(firstJsonMatch[1]);
            const catalogInfo = data.props?.pageProps?.initialState?.catalog?.info;
            const productsList = data.props?.pageProps?.initialState?.products?.list || [];
            
            if (catalogInfo) {
              foundProductName = catalogInfo.productName || catalogInfo.productTitle || "";
              foundImage = catalogInfo.imageUrl || "";
            } else if (productsList.length > 0) {
              const firstItem = productsList[0].item;
              foundProductName = firstItem.productName || firstItem.productTitle || "";
              foundImage = firstItem.imageUrl || "";
            }
          } catch (e) {
            console.error("1차 파싱 중 JSON 에러:", e);
          }
        }

        // 정규식 폴백으로 타이틀 발췌
        if (!foundProductName) {
          const titleMatch = firstHtml.match(/class="[a-zA-Z0-9_-]*product_title[a-zA-Z0-9_-]*"[^>]*><a[^>]*title="([^"]+)"/i) || firstHtml.match(/class="[a-zA-Z0-9_-]*product_link[a-zA-Z0-9_-]*"[^>]*>([^<]+)<\/a>/);
          if (titleMatch) {
            foundProductName = titleMatch[1].replace(/<[^>]*>?/g, '');
          }
        }

        // 만약 1단계에서 한글 상품명을 찾아내지 못했다면, 네이버 쇼핑 DB에 바코드 매핑 자체가 아예 없는 상태임
        if (!foundProductName && !productData) {
          const country = getBarcodeCountry(barcode);
          setScannedProduct({
            barcode: barcode,
            name: `미등록 상품 (원산지: ${country})`,
            image: "https://images.unsplash.com/photo-1595079676339-1534801ad6cf?auto=format&fit=crop&q=80&w=400",
            lowPrice: 0,
            shippingFee: 0,
            mallName: "정보 없음",
            link: `https://search.shopping.naver.com/search/all?query=${barcode}`,
            isUnregistered: true
          });
          setIsPriceOpen(true);
          return; // 함수 종료
        }

        // --- 2단계: 알아낸 진짜 상품명으로 '진짜 최저가 카탈로그' 재조회 ---
        const finalKeyword = foundProductName || queryStr;
        const secondTargetUrl = `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(finalKeyword)}`;
        const secondProxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(secondTargetUrl)}`;
        const finalResponse = await fetch(secondProxyUrl);

        if (!finalResponse.ok) {
          throw new Error('2차 최저가 정보 재조회 실패');
        }

        const finalHtml = await finalResponse.text();
        let apiProduct = null;

        const finalJsonMatch = finalHtml.match(/<script id="__NEXT_DATA__" type="application/json">([\s\S]*?)<\/script>/);
        if (finalJsonMatch) {
          try {
            const finalData = JSON.parse(finalJsonMatch[1]);
            const catalogInfo = finalData.props?.pageProps?.initialState?.catalog?.info;
            const productsList = finalData.props?.pageProps?.initialState?.products?.list || [];
            
            if (catalogInfo) {
              apiProduct = {
                barcode: barcode,
                name: finalKeyword,
                image: catalogInfo.imageUrl || foundImage || "",
                lowPrice: parseInt(catalogInfo.lowPrice) || 0,
                shippingFee: 0,
                mallName: catalogInfo.mallName || "네이버쇼핑 최저가",
                link: `https://search.shopping.naver.com/catalog/${catalogInfo.id}`
              };
            } else if (productsList.length > 0) {
              const firstItem = productsList[0].item;
              apiProduct = {
                barcode: barcode,
                name: finalKeyword,
                image: firstItem.imageUrl || foundImage || "",
                lowPrice: parseInt(firstItem.lowPrice) || 0,
                shippingFee: parseInt(firstItem.deliveryFee) || 0,
                mallName: firstItem.mallName || "네이버쇼핑",
                link: firstItem.adcrUrl || `https://search.shopping.naver.com/catalog/${firstItem.id}`
              };
            }
          } catch (jsonErr) {
            console.error("2차 파싱 중 JSON 에러:", jsonErr);
          }
        }

        // 3순위 폴백: 정규식 패턴 파싱
        if (!apiProduct) {
          const priceMatch = finalHtml.match(/<span>최저\s*<\/span>\s*<span[^>]*>([\d,]+)원/i) || finalHtml.match(/class="[a-zA-Z0-9_-]*price_num[a-zA-Z0-9_-]*"[^>]*>([\d,]+)원/);
          const imgMatch = finalHtml.match(/class="[a-zA-Z0-9_-]*thumbnail_image[a-zA-Z0-9_-]*"[^>]*src="([^"]+)"/i) || finalHtml.match(/<img[^>]*src="([^"]+)"[^>]*class="[a-zA-Z0-9_-]*thumbnail/);

          if (priceMatch) {
            apiProduct = {
              barcode: barcode,
              name: finalKeyword,
              image: imgMatch ? imgMatch[1] : foundImage,
              lowPrice: parseInt(priceMatch[1].replace(/,/g, '')) || 0,
              shippingFee: 3000,
              mallName: "네이버쇼핑",
              link: `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(finalKeyword)}`
            };
          }
        }

        if (apiProduct) {
          apiProduct.shippingFee = apiProduct.lowPrice < 30000 && apiProduct.shippingFee === 0 ? 3000 : apiProduct.shippingFee;
          setScannedProduct(apiProduct);
        } else {
          // 조회는 됬지만 최종 가격 정보 생성에 실패한 경우
          setScannedProduct(productData || {
            barcode: barcode,
            name: finalKeyword,
            image: foundImage || "",
            lowPrice: 0,
            shippingFee: 0,
            mallName: "정보 없음",
            link: `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(finalKeyword)}`,
            isUnregistered: true
          });
        }
        setIsPriceOpen(true);
      } catch (err) {
        console.error("Scraping Fetch Error, falling back to mock: ", err);
        const country = getBarcodeCountry(barcode);
        setScannedProduct(productData || {
          barcode: barcode,
          name: `검색 실패 상품 (원산지: ${country})`,
          image: "https://images.unsplash.com/photo-1595079676339-1534801ad6cf?auto=format&fit=crop&q=80&w=400",
          lowPrice: 0,
          shippingFee: 0,
          mallName: "연동 오류",
          link: `https://search.shopping.naver.com/search/all?query=${barcode}`,
          isUnregistered: true
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

// 바코드 앞3자리를 기준으로 국가를 판별하는 헬퍼 함수
function getBarcodeCountry(barcode) {
  if (!barcode || barcode.length < 3) return "알 수 없음";
  const prefix = barcode.substring(0, 3);
  const prefixNum = parseInt(prefix);
  
  if (prefixNum === 880) return "대한민국";
  if (prefixNum === 480) return "필리핀";
  if ((prefixNum >= 450 && prefixNum <= 459) || (prefixNum >= 490 && prefixNum <= 499)) return "일본";
  if (prefixNum >= 690 && prefixNum <= 699) return "중국";
  if (prefixNum === 885) return "태국";
  if (prefixNum >= 0 && prefixNum <= 19) return "미국/캐나다";
  if (prefixNum >= 300 && prefixNum <= 379) return "프랑스";
  if (prefixNum >= 400 && prefixNum <= 440) return "독일";
  if (prefixNum >= 500 && prefixNum <= 509) return "영국";
  if (prefixNum === 884) return "캄보디아";
  if (prefixNum === 893) return "베트남";
  if (prefixNum === 899) return "인도네시아";
  if (prefixNum === 955) return "말레이시아";
  if (prefixNum === 471) return "대만";
  
  return "해외 국가";
}
