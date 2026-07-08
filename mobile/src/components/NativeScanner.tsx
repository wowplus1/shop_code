import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

export default function NativeScanner({ onScan, onOcrScan, isPaused }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [torchOn, setTorchOn] = React.useState(false);
  const [scanMode, setScanMode] = React.useState('barcode'); // 'barcode' | 'ocr'
  const [ocrLoading, setOcrLoading] = React.useState(false);
  const cameraRef = React.useRef(null);

  // 1. 카메라 권한 상태 로딩 대기
  if (!permission) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.messageText}>카메라 모듈을 로딩 중입니다...</Text>
      </View>
    );
  }

  // 2. 카메라 권한이 아직 획득되지 않았을 때 수락 화면 제공
  if (!permission.granted) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorTitle}>카메라 접근 권한 필요</Text>
        <Text style={styles.errorDescription}>
          바코드를 스캔하거나 포장지 글자를 읽어 최저가를 비교하려면 카메라 권한이 필수적입니다.
        </Text>
        <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
          <Text style={styles.permissionBtnText}>카메라 허용하기</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 3. 바코드 판독 성공 핸들러
  const handleBarcodeScanned = ({ type, data }) => {
    if (isPaused || scanMode !== 'barcode') return;
    
    if (data) {
      onScan(data);
    }
  };

  // 4. ocr.space API 활용 텍스트 인식 핸들러
  const handleOcrCapture = async () => {
    if (isPaused || ocrLoading || !cameraRef.current) return;
    setOcrLoading(true);

    try {
      // 모바일 카메라 촬영 (Base64 파일 추출 및 화질 압축)
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.6,
        base64: true,
        skipProcessing: true
      });

      if (!photo || !photo.base64) {
        throw new Error("스냅샷 획득 실패");
      }

      // 무료 공용 OcrSpace 한글 탐지 요청
      const apikey = "helloworld";
      const formData = new URLSearchParams();
      formData.append("apikey", apikey);
      formData.append("language", "kor");
      formData.append("base64Image", `data:image/jpeg;base64,${photo.base64}`);

      const response = await fetch("https://api.ocr.space/parse/image", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: formData.toString()
      });

      if (!response.ok) {
        throw new Error(`OCR 전송 실패 (코드: ${response.status})`);
      }

      const resJson = await response.json();
      const parsedText = resJson.ParsedResults?.[0]?.ParsedText || "";

      // 한글/영문/숫자 단위로 단어 추출 정제
      const cleanText = parsedText
        .replace(/[^가-힣a-zA-Z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      if (cleanText && cleanText.length > 1) {
        onOcrScan(cleanText);
      } else {
        alert("포장지 글자를 인식하지 못했습니다.\n조금 더 정면에서 밝게 비추어 주세요!");
      }
    } catch (err) {
      console.error("OCR Error: ", err);
      alert("글자 판독에 일시적으로 실패했습니다. 다시 촬영해 주세요.");
    } finally {
      setOcrLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFillObject}
        facing="back"
        enableTorch={torchOn}
        barcodeScannerSettings={scanMode === 'barcode' ? {
          barcodeTypes: ['ean13', 'ean8', 'upca', 'upce'],
        } : undefined}
        onBarcodeScanned={scanMode === 'barcode' ? handleBarcodeScanned : undefined}
      >
        {/* 스캔 조준선 가이드 레이아웃 마스크 */}
        <View style={styles.overlay}>
          {/* 상단 어두운 영역 및 상단 모드 스위처 */}
          <View style={styles.topContainer}>
            <View style={styles.modeTabs}>
              <TouchableOpacity 
                style={[styles.tabBtn, scanMode === 'barcode' && styles.activeTab]}
                onPress={() => setScanMode('barcode')}
              >
                <Text style={[styles.tabText, scanMode === 'barcode' && styles.activeTabText]}>
                  📊 바코드 스캔
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.tabBtn, scanMode === 'ocr' && styles.activeTab]}
                onPress={() => setScanMode('ocr')}
              >
                <Text style={[styles.tabText, scanMode === 'ocr' && styles.activeTabText]}>
                  📝 글자 인식 (OCR)
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {/* 중간 조준선 박스 라인 */}
          <View style={styles.middleContainer}>
            <View style={styles.sideUnfocused} />
            <View style={[
              styles.focusedTarget, 
              scanMode === 'ocr' ? styles.focusedOcrTarget : styles.focusedBarcodeTarget
            ]}>
              {/* 네 모퉁이 가이드 코너 브래킷 */}
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
              
              {/* 스캔 레이저 애니메이션선 또는 OCR 조준선 */}
              <View style={scanMode === 'ocr' ? styles.ocrAimCross : styles.laserLine} />
            </View>
            <View style={styles.sideUnfocused} />
          </View>
          
          {/* 하단 어두운 영역 및 컨트롤 버튼 */}
          <View style={[styles.bottomUnfocused, styles.bottomControls]}>
            <Text style={styles.guideText}>
              {scanMode === 'ocr' 
                ? "포장지의 한글 상품명이 가이드 박스 안에 차도록 대고 아래 버튼을 누르세요."
                : "가이드 박스 안에 바코드를 비추면 즉시 스캔됩니다."
              }
            </Text>

            {scanMode === 'ocr' ? (
              <TouchableOpacity 
                style={[styles.shutterBtn, ocrLoading && styles.shutterDisabled]}
                onPress={handleOcrCapture}
                disabled={ocrLoading}
              >
                {ocrLoading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.shutterText}>📸 포장지 글자 읽기</Text>
                )}
              </TouchableOpacity>
            ) : (
              /* 플래시 토글 버튼 */
              <TouchableOpacity 
                style={styles.torchBtn} 
                onPress={() => setTorchOn(!torchOn)}
              >
                {torchOn ? (
                  <Text style={{ fontSize: 18, color: '#FFF' }}>⚡</Text>
                ) : (
                  <Text style={{ fontSize: 18, color: 'rgba(255,255,255,0.6)' }}>💤</Text>
                )}
                <Text style={styles.torchBtnText}>
                  {torchOn ? '플래시 켜짐' : '플래시 끄기'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121214',
    padding: 24,
  },
  messageText: {
    color: '#E1E1E6',
    fontSize: 16,
  },
  errorTitle: {
    color: '#FF6B6B',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  errorDescription: {
    color: '#8D8D99',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  permissionBtn: {
    backgroundColor: '#FF4A6B',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  permissionBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  overlay: {
    flex: 1,
  },
  topContainer: {
    height: 100,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 16,
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 24,
    padding: 4,
    width: '85%',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 20,
  },
  activeTab: {
    backgroundColor: '#FF4A6B',
  },
  tabText: {
    color: '#8D8D99',
    fontSize: 14,
    fontWeight: 'bold',
  },
  activeTabText: {
    color: '#FFF',
  },
  middleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideUnfocused: {
    flex: 1,
    height: 260,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  focusedTarget: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  focusedBarcodeTarget: {
    width: 300,
    height: 150,
  },
  focusedOcrTarget: {
    width: 260,
    height: 260,
  },
  bottomUnfocused: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#00F0FF',
    borderWidth: 3,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  laserLine: {
    width: '90%',
    height: 2,
    backgroundColor: '#FF4A6B',
    opacity: 0.8,
  },
  ocrAimCross: {
    width: 40,
    height: 40,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.4)',
    borderRadius: 20,
  },
  bottomControls: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
  },
  guideText: {
    color: '#C4C4CC',
    fontSize: 13,
    marginBottom: 16,
    textAlign: 'center',
    paddingHorizontal: 24,
    lineHeight: 18,
  },
  torchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 24,
  },
  torchBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  shutterBtn: {
    backgroundColor: '#FF4A6B',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 28,
    shadowColor: '#FF4A6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  shutterDisabled: {
    backgroundColor: '#8D8D99',
  },
  shutterText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
