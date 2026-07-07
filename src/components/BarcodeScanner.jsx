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
        fps: 20,
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E
        ],
        qrbox: (width, height) => {
          return { width: Math.min(width, 280), height: Math.min(height, 130) };
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
        // 1차 시도: 고해상도 후면 카메라 획득 요구 (선명도 확보)
        const highResConstraints = {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        };
        await html5Qrcode.start(highResConstraints, scannerOptions, handleSuccess, handleFailure);
      } catch (err) {
        console.warn("High-res camera constraints failed, falling back to default environment camera:", err);
        try {
          // 2차 시도 (폴백): 해상도 조건 제거 후 기본 후면 카메라 시도
          await html5Qrcode.start({ facingMode: "environment" }, scannerOptions, handleSuccess, handleFailure);
        } catch (fallbackErr) {
          console.error("Camera startup failed completely:", fallbackErr);
          setCameraError("카메라 작동을 시작할 수 없습니다. 카메라 권한 승인 상태 혹은 브라우저 설정을 점검해 주세요.");
          return; // 실패 시 이후 코드 생략
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
