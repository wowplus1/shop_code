import React, { useState, useEffect } from 'react';
import { Settings, X, Save } from 'lucide-react';

export default function SettingsModal({ isOpen, onClose, onSaveSettings }) {
  const [clientId, setClientId] = useState('3GZMhpS_2U1c6HhGMeWk');
  const [clientSecret, setClientSecret] = useState('rv0kU8KUOX');
  const [useMock, setUseMock] = useState(false);

  useEffect(() => {
    const savedId = localStorage.getItem('naver_client_id') || '3GZMhpS_2U1c6HhGMeWk';
    const savedSecret = localStorage.getItem('naver_client_secret') || 'rv0kU8KUOX';
    const savedMode = localStorage.getItem('use_mock_data') === 'true'; // 기본 false

    setClientId(savedId);
    setClientSecret(savedSecret);
    setUseMock(savedMode);
  }, [isOpen]);

  const handleSave = () => {
    localStorage.setItem('naver_client_id', clientId.trim());
    localStorage.setItem('naver_client_secret', clientSecret.trim());
    localStorage.setItem('use_mock_data', useMock ? 'true' : 'false');
    
    onSaveSettings({
      clientId: clientId.trim(),
      clientSecret: clientSecret.trim(),
      useMock: useMock
    });
    onClose();
  };

  return (
    <div className={`full-modal-backdrop ${isOpen ? 'active' : ''}`} onClick={onClose}>
      <div className="modal-content-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="card-title">
            <Settings size={20} />
            API & 시스템 설정
          </h3>
          <button className="close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="form-group" style={{ marginBottom: '20px' }}>
          <label className="form-label">작동 모드 선택</label>
          <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
            <button
              type="button"
              className="btn-secondary"
              style={{
                background: useMock ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-tertiary)',
                borderColor: useMock ? '#60a5fa' : 'var(--glass-border)',
                color: useMock ? '#60a5fa' : 'var(--text-secondary)'
              }}
              onClick={() => setUseMock(true)}
            >
              Mock 모드 (테스트용)
            </button>
            <button
              type="button"
              className="btn-secondary"
              style={{
                background: !useMock ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-tertiary)',
                borderColor: !useMock ? '#34d399' : 'var(--glass-border)',
                color: !useMock ? '#34d399' : 'var(--text-secondary)'
              }}
              onClick={() => setUseMock(false)}
            >
              네이버 API 모드
            </button>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: '1.4' }}>
            {useMock 
              ? "Mock 모드는 별도 API 설정 없이 신라면(8801043014798), 햇반(8801007112508) 등의 대표 바코드로 최저가 비교를 테스트할 수 있는 모드입니다." 
              : "네이버 API 모드는 네이버 개발자센터에서 발급받은 검색 API 키를 사용하여 실제 실시간 최저가 데이터를 조회합니다."
            }
          </p>
        </div>

        {!useMock && (
          <>
            <div className="form-group">
              <label className="form-label" htmlFor="client-id">Naver Client ID</label>
              <input
                id="client-id"
                type="text"
                className="form-input"
                placeholder="ID를 입력하세요"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="client-secret">Naver Client Secret</label>
              <input
                id="client-secret"
                type="password"
                className="form-input"
                placeholder="Secret을 입력하세요"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
              />
            </div>
            
            <p style={{ fontSize: '0.7rem', color: 'var(--accent-color)', marginBottom: '16px', lineHeight: '1.3' }}>
              * API 키는 브라우저 로컬 저장소(localStorage)에 안전하게 저장되며, 외부 서버로 전송되지 않습니다. (CORS 에러 발생 시 로컬 Proxy를 통해서 호출됩니다)
            </p>
          </>
        )}

        <div className="form-actions">
          <button className="btn-secondary" onClick={onClose}>취소</button>
          <button className="btn-primary" onClick={handleSave} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <Save size={16} />
            설정 저장
          </button>
        </div>
      </div>
    </div>
  );
}
