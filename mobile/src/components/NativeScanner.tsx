import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Zap, ZapOff } from 'lucide-react-native';

export default function NativeScanner({ onScan, isPaused }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [torchOn, setTorchOn] = React.useState(false);

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
          바코드를 0.01초 만에 스캔하여 최저가를 비교하려면 카메라 권한이 필수적입니다.
        </Text>
        <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
          <Text style={styles.permissionBtnText}>카메라 허용하기</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 3. 바코드 판독 성공 핸들러
  const handleBarcodeScanned = ({ type, data }) => {
    if (isPaused) return;
    
    // 유효한 바코드 정보가 읽혔을 때 부모 콜백 실행
    if (data) {
      onScan(data);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        enableTorch={torchOn}
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upca', 'upce'],
        }}
        onBarcodeScanned={handleBarcodeScanned}
      >
        {/* 스캔 조준선 가이드 레이아웃 마스크 */}
        <View style={styles.overlay}>
          {/* 상단 어두운 영역 */}
          <View style={styles.unfocusedContainer} />
          
          {/* 중간 조준선 박스 라인 */}
          <View style={styles.middleContainer}>
            <View style={styles.unfocusedContainer} />
            <View style={styles.focusedTarget}>
              {/* 네 모퉁이 가이드 코너 브래킷 */}
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
              
              {/* 스캔 레이저 애니메이션선 시뮬레이션 */}
              <View style={styles.laserLine} />
            </View>
            <View style={styles.unfocusedContainer} />
          </View>
          
          {/* 하단 어두운 영역 및 컨트롤 버튼 */}
          <View style={[styles.unfocusedContainer, styles.bottomControls]}>
            <Text style={styles.guideText}>
              가이드 박스 안에 바코드를 비추면 즉시 스캔됩니다.
            </Text>
            
            {/* 플래시 토글 버튼 */}
            <TouchableOpacity 
              style={styles.torchBtn} 
              onPress={() => setTorchOn(!torchOn)}
            >
              {torchOn ? (
                <Zap size={20} color="#FFF" />
              ) : (
                <ZapOff size={20} color="rgba(255,255,255,0.6)" />
              )}
              <Text style={styles.torchBtnText}>
                {torchOn ? '플래시 켜짐' : '플래시 끄기'}
              </Text>
            </TouchableOpacity>
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
  unfocusedContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  middleContainer: {
    flexDirection: 'row',
    height: 180,
  },
  focusedTarget: {
    width: 300,
    height: 180,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
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
    shadowColor: '#FF4A6B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  bottomControls: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
  },
  guideText: {
    color: '#C4C4CC',
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
    paddingHorizontal: 16,
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
});
