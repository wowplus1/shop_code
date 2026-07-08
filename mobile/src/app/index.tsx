import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  Image, 
  Linking, 
  Modal,
  ActivityIndicator,
  Dimensions,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import NativeScanner from '../components/NativeScanner';
import SearchModal from '../components/SearchModal';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function HomeScreen() {
  const [isScannerPaused, setIsScannerPaused] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isPriceOpen, setIsPriceOpen] = useState(false);
  const [scannedProduct, setScannedProduct] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  // 바코드 스캔 성공 핸들러
  const handleScanSuccess = async (barcode) => {
    console.log("Scanned Barcode: ", barcode);
    setIsScannerPaused(true); // 추가 스캔 방지를 위해 스캐너 즉시 일시정지
    setIsSearching(true);
    
    // 원산지 국가 조회
    const country = getBarcodeCountry(barcode);
    
    try {
      const clientId = "3GZMhpS_2U1c6HhGMeWk";
      const clientSecret = "rv0kU8KUOX";
      
      // --- 1단계: 봇 감지 없는 네이버 통합검색으로 바코드에서 한글 상품명 1차 추출 ---
      const searchUrl = `https://search.naver.com/search.naver?query=${encodeURIComponent(barcode)}`;
      const searchRes = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      let foundProductName = "";
      if (searchRes.ok) {
        const searchHtml = await searchRes.text();
        
        // "title":"상품명" 패턴 매칭 시도
        const titleMatches = [...searchHtml.matchAll(/"title"\s*:\s*"([^"]+)"/g)];
        for (const m of titleMatches) {
          const t = m[1];
          if (t && t.length > 2 && !t.includes("네이버") && !t.includes("통합검색") && !t.includes("CSS") && !t.includes("JS") && !t.includes("image")) {
            foundProductName = t.replace(/<\/?[^>]+(>|$)/g, "").trim();
            break;
          }
        }

        // alt="상품명...의 이미지" 패턴 매칭 시도 (폴백)
        if (!foundProductName) {
          const altMatches = [...searchHtml.matchAll(/alt="([^"]+?)(?:의 이미지)?"/g)];
          for (const m of altMatches) {
            const a = m[1];
            if (a && a.length > 2 && !a.includes("네이버") && !a.includes("로고") && !a.includes("아이콘") && !a.includes("화면")) {
              foundProductName = a.trim();
              break;
            }
          }
        }
      }

      // --- 2단계: 알아낸 진짜 상품명이 있으면 쇼핑 오픈 API로 최저가 정보 조회 ---
      if (foundProductName) {
        const response = await fetch(`https://openapi.naver.com/v1/search/shop.json?query=${encodeURIComponent(foundProductName)}&display=5`, {
          headers: {
            'X-Naver-Client-Id': clientId,
            'X-Naver-Client-Secret': clientSecret,
            'Accept': 'application/json'
          }
        });

        if (response.ok) {
          const resData = await response.json();
          const items = resData.items || [];

          if (items.length > 0) {
            const firstItem = items[0];
            const cleanName = firstItem.title
              ? firstItem.title.replace(/<\/?[^>]+(>|$)/g, "").replace(/&quot;/g, '"').replace(/&amp;/g, '&')
              : foundProductName;

            const lowPriceVal = parseInt(firstItem.lprice) || 0;
            const shippingFeeVal = lowPriceVal < 30000 ? 3000 : 0;

            setScannedProduct({
              barcode: barcode,
              name: cleanName,
              image: firstItem.image || "https://images.unsplash.com/photo-1595079676339-1534801ad6cf?auto=format&fit=crop&q=80&w=400",
              lowPrice: lowPriceVal,
              shippingFee: shippingFeeVal,
              mallName: firstItem.mallName || "네이버쇼핑",
              link: firstItem.link || `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(cleanName)}`
            });
            return;
          }
        }
      }

      // --- 3단계: 바코드에 대응하는 상품이 네이버 통합DB에 등록되어 있지 않은 경우 ---
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
    } catch (err) {
      console.error("API Fetch Error: ", err);
      setScannedProduct({
        barcode: barcode,
        name: `조회 실패 상품 (원산지: ${country})`,
        image: "https://images.unsplash.com/photo-1595079676339-1534801ad6cf?auto=format&fit=crop&q=80&w=400",
        lowPrice: 0,
        shippingFee: 0,
        mallName: "연동 오류",
        link: `https://search.shopping.naver.com/search/all?query=${barcode}`,
        isUnregistered: true
      });
    } finally {
      setIsSearching(false);
      setIsPriceOpen(true);
    }
  };

  // OCR 글자 판독 성공 핸들러
  const handleOcrSuccess = async (ocrText) => {
    console.log("OCR Detected Text: ", ocrText);
    setIsScannerPaused(true);
    setIsSearching(true);

    try {
      const clientId = "3GZMhpS_2U1c6HhGMeWk";
      const clientSecret = "rv0kU8KUOX";

      // 단어가 많으면 상위 3개 단어(키워드)만 발췌하여 검색 신뢰성 확보
      const words = ocrText.split(/\s+/).filter(w => w.length >= 2);
      const searchKeyword = words.slice(0, 3).join(" ") || ocrText;

      const response = await fetch(`https://openapi.naver.com/v1/search/shop.json?query=${encodeURIComponent(searchKeyword)}&display=5`, {
        headers: {
          'X-Naver-Client-Id': clientId,
          'X-Naver-Client-Secret': clientSecret,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`API 호출 실패 (코드: ${response.status})`);
      }

      const resData = await response.json();
      const items = resData.items || [];

      if (items.length > 0) {
        const firstItem = items[0];
        const cleanName = firstItem.title
          ? firstItem.title.replace(/<\/?[^>]+(>|$)/g, "").replace(/&quot;/g, '"').replace(/&amp;/g, '&')
          : searchKeyword;

        const lowPriceVal = parseInt(firstItem.lprice) || 0;
        const shippingFeeVal = lowPriceVal < 30000 ? 3000 : 0;

        setScannedProduct({
          barcode: "",
          name: cleanName,
          image: firstItem.image || "https://images.unsplash.com/photo-1595079676339-1534801ad6cf?auto=format&fit=crop&q=80&w=400",
          lowPrice: lowPriceVal,
          shippingFee: shippingFeeVal,
          mallName: firstItem.mallName || "네이버쇼핑",
          link: firstItem.link || `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(cleanName)}`
        });
      } else {
        setScannedProduct({
          barcode: "",
          name: `검색 실패 상품 (${searchKeyword})`,
          image: "https://images.unsplash.com/photo-1595079676339-1534801ad6cf?auto=format&fit=crop&q=80&w=400",
          lowPrice: 0,
          shippingFee: 0,
          mallName: "정보 없음",
          link: `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(searchKeyword)}`,
          isUnregistered: true
        });
      }
    } catch (err) {
      console.error("OCR API Search Error: ", err);
      setScannedProduct({
        barcode: "",
        name: `판독 결과 조회 실패 (연동 오류)`,
        image: "https://images.unsplash.com/photo-1595079676339-1534801ad6cf?auto=format&fit=crop&q=80&w=400",
        lowPrice: 0,
        shippingFee: 0,
        mallName: "연동 오류",
        link: "https://search.shopping.naver.com",
        isUnregistered: true
      });
    } finally {
      setIsSearching(false);
      setIsPriceOpen(true);
    }
  };

  // 수동 검색 상품 선택 핸들러
  const handleSelectProduct = (product) => {
    setScannedProduct(product);
    setIsScannerPaused(true);
    setIsPriceOpen(true);
  };

  // 아웃링크 브라우저 연동 핸들러
  const handleOpenLink = () => {
    if (scannedProduct && scannedProduct.link) {
      Linking.openURL(scannedProduct.link).catch(err => {
        console.error("Failed to open URL:", err);
      });
    }
  };

  // 결과창 모달 닫기
  const handleCloseModal = () => {
    setIsPriceOpen(false);
    setScannedProduct(null);
    setIsScannerPaused(false); // 스캔 재개
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* 상단 툴바 영역 */}
        <View style={styles.header}>
          <View style={styles.titleGroup}>
            <Text style={{ fontSize: 20, marginRight: 6 }}>📸</Text>
            <Text style={styles.headerTitle}>마트 최저가 스캐너</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.iconBtn} 
            onPress={() => {
              setIsScannerPaused(true);
              setIsSearchOpen(true);
            }}
          >
            <Text style={{ fontSize: 20 }}>🔍</Text>
          </TouchableOpacity>
        </View>

        {/* 네이티브 하드웨어 스캐너 엔진 */}
        <View style={styles.scannerWrapper}>
          <NativeScanner 
            onScan={handleScanSuccess} 
            onOcrScan={handleOcrSuccess}
            isPaused={isScannerPaused} 
          />
        </View>

        {/* 1차 스캔 직후 NEXT_DATA 백그라운드 크롤링 대기 오버레이 */}
        {isSearching && (
          <View style={styles.searchOverlay}>
            <ActivityIndicator size="large" color="#FF4A6B" />
            <Text style={styles.searchOverlayText}>실시간 상품 판독 완료! 온라인 최저가 가격 비교 중...</Text>
          </View>
        )}

        {/* 수동 검색용 모달 팝업 */}
        <SearchModal
          isOpen={isSearchOpen}
          onClose={() => {
            setIsSearchOpen(false);
            if (!isPriceOpen) setIsScannerPaused(false);
          }}
          onSelectProduct={handleSelectProduct}
        />

        {/* 하프 모달 가격 비교 결과 팝업 */}
        <Modal
          visible={isPriceOpen}
          transparent={true}
          animationType="slide"
          onRequestClose={handleCloseModal}
        >
          {/* 모달 백드롭 터치 시 닫기 */}
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1} 
            onPress={handleCloseModal}
          />
          
          <View style={styles.halfModal}>
            <View style={styles.indicator} />
            
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle}>최저가 비교 결과</Text>
              <TouchableOpacity onPress={handleCloseModal} style={styles.closeBtn}>
                <Text style={{ fontSize: 18, color: '#E1E1E6' }}>❌</Text>
              </TouchableOpacity>
            </View>

            {scannedProduct && (
              <View style={styles.modalBody}>
                <Image 
                  source={{ uri: scannedProduct.image || 'https://images.unsplash.com/photo-1595079676339-1534801ad6cf?auto=format&fit=crop&q=80&w=400' }} 
                  style={styles.productImage}
                />
                
                <View style={styles.productDetails}>
                  <Text style={styles.productName} numberOfLines={2}>
                    {scannedProduct.name}
                  </Text>
                  
                  <View style={styles.priceContainer}>
                    {scannedProduct.isUnregistered ? (
                      <>
                        <Text style={[styles.mallName, { color: '#FF4A6B' }]}>정보 미등록 상품</Text>
                        <Text style={[styles.priceValue, { fontSize: 18, color: '#C4C4CC', fontWeight: 'bold' }]}>
                          최저가 정보 없음
                        </Text>
                        <Text style={styles.shippingFee}>
                          국내 유통 상품이 아니거나 바코드 정보가 없습니다.
                        </Text>
                      </>
                    ) : (
                      <>
                        <Text style={styles.mallName}>{scannedProduct.mallName} 최저가</Text>
                        <Text style={styles.priceValue}>
                          {Number(scannedProduct.lowPrice).toLocaleString()}
                          <Text style={styles.priceUnit}>원</Text>
                        </Text>
                        <Text style={styles.shippingFee}>
                          {scannedProduct.shippingFee === 0 ? '무료배송' : `배송비 ${Number(scannedProduct.shippingFee).toLocaleString()}원`}
                        </Text>
                      </>
                    )}
                  </View>
                </View>
              </View>
            )}

            {/* 가격 연동 아웃링크 버튼 */}
            {scannedProduct && (
              <TouchableOpacity 
                style={styles.actionBtn}
                onPress={handleOpenLink}
              >
                <Text style={styles.actionBtnText}>
                  {scannedProduct.isUnregistered ? '네이버 쇼핑에서 수동 검색하기' : '온라인 최저가 보러가기'}
                </Text>
                <Text style={{ fontSize: 14, color: '#FFF', marginLeft: 6 }}>🔗</Text>
              </TouchableOpacity>
            )}
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

// 바코드 앞 3자리 접두사를 기반으로 제조 국가를 판별하는 헬퍼 함수
function getBarcodeCountry(barcode: string) {
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121214',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#121214',
    borderBottomWidth: 1,
    borderColor: '#202024',
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  iconBtn: {
    padding: 6,
  },
  scannerWrapper: {
    flex: 1,
  },
  searchOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(18, 18, 20, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  searchOverlayText: {
    color: '#E1E1E6',
    marginTop: 16,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  halfModal: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.45,
    backgroundColor: '#202024',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    borderWidth: 1,
    borderColor: '#29292E',
  },
  indicator: {
    width: 36,
    height: 4,
    backgroundColor: '#323238',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalHeaderTitle: {
    color: '#C4C4CC',
    fontSize: 13,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  closeBtn: {
    padding: 4,
  },
  modalBody: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  productImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: '#121214',
  },
  productDetails: {
    flex: 1,
    marginLeft: 16,
  },
  productName: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    lineHeight: 20,
    marginBottom: 10,
  },
  priceContainer: {
    marginTop: 4,
  },
  mallName: {
    color: '#8D8D99',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  priceValue: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  priceUnit: {
    fontSize: 16,
    fontWeight: '600',
    color: '#C4C4CC',
    marginLeft: 2,
  },
  shippingFee: {
    color: '#7C7C8A',
    fontSize: 12,
    marginTop: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    backgroundColor: '#FF4A6B',
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF4A6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  actionBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
