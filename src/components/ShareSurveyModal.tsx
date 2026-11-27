import { useEffect, useState } from 'react';
import { createTranslator } from '../i18n/index.ts';
import { buildPublicSurveyUrl, buildViberShareUrl } from '../lib/urls.ts';
import { useAppStore } from '../store/useAppStore.ts';
import type { Survey } from '../types/survey.ts';

interface ShareSurveyModalProps {
  survey: Survey;
  onClose: () => void;
}

export function ShareSurveyModal({ survey, onClose }: ShareSurveyModalProps) {
  const locale = useAppStore((s) => s.locale);
  const showToast = useAppStore((s) => s.showToast);
  const t = createTranslator(locale);

  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [fullscreen, setFullscreen] = useState(false);

  const publicUrl = buildPublicSurveyUrl(survey.id);
  const viberUrl = buildViberShareUrl(publicUrl);

  useEffect(() => {
    let active = true;
    import('qrcode')
      .then((QRCode) =>
        QRCode.default.toDataURL(publicUrl, {
          width: 320,
          margin: 2,
          color: { dark: '#000000', light: '#ffffff' },
        })
      )
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch(() => {
        if (active) setQrDataUrl('');
      });
    return () => {
      active = false;
    };
  }, [publicUrl]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      showToast(t('share.copiedToast'));
    } catch {
      const input = document.createElement('input');
      input.value = publicUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      showToast(t('share.copiedToast'));
    }
  }

  if (fullscreen) {
    return (
      <div className="qr-fullscreen" role="dialog" aria-modal="true">
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>{survey.title}</h2>
        {qrDataUrl && (
          <img
            src={qrDataUrl}
            alt={survey.title}
            style={{ width: 'min(82vw, 380px)', height: 'auto', display: 'block' }}
          />
        )}
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setFullscreen(false)}
        >
          {t('share.exitFullscreen')}
        </button>
      </div>
    );
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="share-title" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 id="share-title" className="modal-title">{t('share.title')}</h2>
          <button type="button" className="btn btn-ghost btn-compact" onClick={onClose} aria-label={t('common.close')}>
            ✕
          </button>
        </div>

        <div style={{ fontWeight: 600, fontSize: 15 }}>{survey.title}</div>

        {qrDataUrl && (
          <div className="qr-box">
            <img src={qrDataUrl} alt={survey.title} width={210} height={210} />
          </div>
        )}

        <div className="field">
          <label htmlFor="share-url" className="field-label">{t('share.linkLabel')}</label>
          <input
            id="share-url"
            className="input"
            readOnly
            value={publicUrl}
            style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}
            onFocus={(e) => e.target.select()}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <a
            href={viberUrl}
            className="btn btn-viber"
            style={{ textDecoration: 'none' }}
          >
            {t('share.shareViber')}
          </a>
          <button type="button" className="btn btn-primary" onClick={handleCopy}>
            {t('share.copyLink')}
          </button>
        </div>

        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          <a
            href={publicUrl}
            target="_blank"
            rel="noreferrer"
            className="btn btn-ghost btn-compact"
            style={{ textDecoration: 'none' }}
          >
            {t('share.openPreview')} ↗
          </a>
          <button
            type="button"
            className="btn btn-secondary btn-compact"
            onClick={() => setFullscreen(true)}
          >
            {t('share.fullscreenQr')}
          </button>
        </div>
      </div>
    </div>
  );
}
