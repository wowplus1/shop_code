import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Zap, ZapOff } from 'lucide-react';

export default function BarcodeScanner({ onScan, isPaused }) {
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
      try {
        setCameraError(null);
        
        // 고해상도(HD 이상) 설정으로 바코드 얇은 선의 뭉개짐 현상 방지
        const videoConstraints = {
          facingMode: "environment",
          width: { min: 640, ideal: 1280, max: 1920 },
          height: { min: 480, ideal: 720, max: 1080 }
        };

        await html5Qrcode.start(
          videoConstraints,
          {
            fps: 20,
            // 명시적 1D 생필품 바코드 포맷 필터링
            formatsToSupport: [
              Html5QrcodeSupportedFormats.EAN_13,
              Html5QrcodeSupportedFormats.EAN_8,
              Html5QrcodeSupportedFormats.UPC_A,
              Html5QrcodeSupportedFormats.UPC_E
            ],
            // 바코드 형태에 맞추어 가로로 긴 영역 분석
            qrbox: (width, height) => {
              return { width: Math.min(width, 280), height: Math.min(height, 130) };
            }
          },
          (decodedText, decodedResult) => {
            // 스캔 성공
            if (!isPaused) {
              onScan(decodedText);
            }
          },
          (errorMessage) => {
            // 스캔 실패 (스캔 중에 프레임 분석 실패 시 빈번하게 발생하므로 로그는 생략하거나 간략화)
          }
        );

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

      } catch (err) {
        console.error("Camera start error: ", err);
        setCameraError("카메라 접근 권한이 필요합니다. 브라우저 설정을 확인해주세요.");
      }
    };

    if (!isPaused) {
      startScanner();
    }

    return () => {
      // 컴포넌트 언마운트 시 클린업
      if (html5Qrcode.isScanning) {
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
      {cameraError ? (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          padding: '24px',
          width: '80%',
          background: 'var(--bg-tertiary)',
          borderRadius: '16px',
          border: '1px solid var(--glass-border)',
          zIndex: 3
        }}>
          <p style={{ color: 'var(--accent-color)', fontWeight: '600', marginBottom: '12px' }}>카메라 구동 실패</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{cameraError}</p>
        </div>
      ) : (
        <div id="reader"></div>
      )}

      {/* 가이드라인 레이아웃 오버레이 */}
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

      <div className="bottom-guide">
        {isPaused ? "결과를 확인하는 중..." : "상품의 바코드를 박스 안에 맞춰주세요."}
      </div>
    </div>
  );
}
