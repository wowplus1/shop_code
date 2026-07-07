import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Zap, ZapOff } from 'lucide-react';

export default function BarcodeScanner({ onScan, isPaused, onOpenSearch }) {
  const scannerRef = useRef(null);
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [cameraError, setCameraError] = useState(null);

  useEffect(() => {
    // 스캐너 초기화 및 구동
    const scannerId = "reader";
    const html5Qrcode = new Html5Qrcode(scannerId);
    scannerRef.current = html5Qrcode;

    const startScanner = async () => {
      setCameraError(null);
      
      const scannerOptions = {
        fps: 10, // 프레임 연산 부하를 줄여 개별 프레임의 선명도를 높이고 초점 획득 개선
        disableFlip: true, // 후면 카메라는 좌우 반전을 생략해 CPU 연산량 대폭 절약
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E
        ],
        qrbox: (width, height) => {
          return { width: Math.min(width, 280), height: Math.min(height, 130) };
        },
        // 하드웨어 가속 네이티브 Barcode Detection API 강제 연동 (지원 기기에서 스캔 속도 10배 이상 향상)
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        }
      };

      const handleSuccess = (decodedText, decodedResult) => {
        if (!isPaused) {
          onScan(decodedText);
        }
      };

      const handleFailure = (errorMessage) => {
        // 스캔 실패 로그 생략
      };

      try {
        // 1. 기기에 부착된 실제 카메라 장치 리스트 획득 (이 과정에서 브라우저가 카메라 승인 팝업을 정상 트리거함)
        const devices = await Html5Qrcode.getCameras();
        
        if (!devices || devices.length === 0) {
          throw new Error("기기에서 활성화된 카메라 장치를 찾을 수 없습니다.");
        }

        // 2. 후면 카메라 필터링 (rear, back, 후면, environment 등 검색)
        let targetCamera = devices.find(device => {
          const label = device.label.toLowerCase();
          return label.includes('back') || label.includes('rear') || label.includes('후면') || label.includes('environment');
        });

        // 후면 카메라 매칭 실패 시 첫 번째 카메라 선택
        const chosenCameraId = targetCamera ? targetCamera.id : devices[0].id;

        // 3. 고유 장치 ID를 직접 파라미터로 넘겨 모바일 브라우저 제약 조건 충돌(OverconstrainedError) 원천 회피
        await html5Qrcode.start(
          chosenCameraId, 
          scannerOptions, 
          handleSuccess, 
          handleFailure
        );
      } catch (err) {
        console.warn("Direct device ID scanner startup failed, trying facingMode fallback:", err);
        try {
          // 4. 최후 폴백: 장치 ID 획득에 오류가 있을 경우 facingMode 환경 힌트로 연동 시도
          await html5Qrcode.start(
            { facingMode: "environment" }, 
            scannerOptions, 
            handleSuccess, 
            handleFailure
          );
        } catch (fallbackErr) {
          console.error("All camera startup attempts failed:", fallbackErr);
          setCameraError("카메라 장치를 시작할 수 없습니다. 1) Safari/Chrome 권한 설정에서 '카메라 허용' 상태인지 확인해 주시고, 2) 카카오톡 등 인앱 브라우저를 쓰고 계시다면 일반 브라우저(Safari/Chrome)로 다시 열어 주세요.");
          return;
        }
      }

      // 플래시(Torch) 지원 여부 확인
      setTimeout(() => {
        try {
          if (typeof html5Qrcode.getRunningTrackCameraCapabilities === 'function') {
            const capabilities = html5Qrcode.getRunningTrackCameraCapabilities();
            if (capabilities && typeof capabilities.hasTorch === 'function' && capabilities.hasTorch()) {
              setHasTorch(true);
            }
          } else if (typeof html5Qrcode.getRunningTrackCapabilities === 'function') {
            const capabilities = html5Qrcode.getRunningTrackCapabilities();
            if (capabilities && capabilities.torch) {
              setHasTorch(true);
            }
          }
        } catch (e) {
          console.log("Torch capability check failed", e);
        }
      }, 1000);
    };

    let timerId = null;

    if (!isPaused) {
      // React DOM 마운트가 완전히 완료된 후 라이브러리가 돔을 참조하도록 200ms 지연 시작
      timerId = setTimeout(() => {
        startScanner();
      }, 200);
    }

    return () => {
      // 타이머 해제
      if (timerId) clearTimeout(timerId);
      
      // 컴포넌트 언마운트 시 안전하게 정지 처리
      if (html5Qrcode && html5Qrcode.isScanning) {
        html5Qrcode.stop().catch(err => console.error("Error stopping scanner", err));
      }
    };
  }, [isPaused]);

  // 플래시 토글 핸들러
  const toggleTorch = async () => {
    if (!scannerRef.current || !hasTorch) return;
    
    try {
      const nextTorchState = !torchOn;
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: nextTorchState }]
      });
      setTorchOn(nextTorchState);
    } catch (e) {
      console.error("Failed to toggle torch", e);
    }
  };

  return (
    <div className="scanner-container">
      {/* reader DOM은 에러 여부와 상관없이 항시 DOM에 유지시켜 라이브러리 오동작 방지 */}
      <div 
        id="reader" 
        style={{ 
          width: '100%', 
          height: '100%', 
          display: cameraError ? 'none' : 'block' 
        }}
      ></div>

      {cameraError && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          padding: '24px',
          width: '85%',
          background: 'var(--bg-secondary)',
          borderRadius: '20px',
          border: '1px solid var(--glass-border)',
          boxShadow: 'var(--shadow-premium)',
          zIndex: 99
        }}>
          <p style={{ color: 'var(--accent-color)', fontWeight: '700', marginBottom: '12px', fontSize: '1.1rem' }}>카메라 구동 실패</p>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: '1.4' }}>
            {cameraError}
          </p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              className="btn-secondary" 
              onClick={() => setCameraError(null)}
              style={{ padding: '10px', fontSize: '0.85rem' }}
            >
              닫기
            </button>
            <button 
              className="btn-primary" 
              onClick={() => {
                setCameraError(null);
                onOpenSearch();
              }}
              style={{ padding: '10px', fontSize: '0.85rem' }}
            >
              수동 검색하기
            </button>
          </div>
        </div>
      )}

      {/* 가이드라인 레이아웃 오버레이 */}
      {!cameraError && (
        <div className="scanner-overlay">
          <div className="overlay-top">
            {/* 플래시 라이트 토글 버튼 */}
            {hasTorch && (
              <button 
                className="icon-btn" 
                onClick={toggleTorch} 
                style={{
                  position: 'absolute',
                  top: '20px',
                  right: '24px',
                  zIndex: 6,
                  borderColor: torchOn ? 'var(--neon-green)' : 'var(--glass-border)',
                  boxShadow: torchOn ? '0 0 15px rgba(16, 185, 129, 0.4)' : 'none'
                }}
              >
                {torchOn ? <Zap size={20} color="var(--neon-green)" /> : <ZapOff size={20} />}
              </button>
            )}
          </div>
          <div className="overlay-middle">
            <div className="overlay-left"></div>
            <div className="overlay-center">
              <div className="guide-box">
                <div className="guide-corner"></div>
                {/* 스캔 움직이는 레이저 라인 */}
                {!isPaused && <div className="laser-line"></div>}
              </div>
            </div>
            <div className="overlay-right"></div>
          </div>
          <div className="overlay-bottom"></div>
        </div>
      )}

      {!cameraError && (
        <div className="bottom-guide">
          {isPaused ? "결과를 확인하는 중..." : "상품의 바코드를 박스 안에 맞춰주세요."}
        </div>
      )}
    </div>
  );
}
