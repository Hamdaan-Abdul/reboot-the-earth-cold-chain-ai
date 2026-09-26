import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';

export function QRScanner({ onClose, onDetected }: { onClose: () => void; onDetected: (value: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onDetectedRef = useRef(onDetected);
  const [message, setMessage] = useState('Starting camera…');
  useEffect(() => { onDetectedRef.current = onDetected; }, [onDetected]);

  useEffect(() => {
    let stream: MediaStream | undefined;
    let frameId = 0;
    let active = true;
    let lastScanAt = 0;
    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setMessage('Camera access is unavailable. Use lot search to open a code instead.');
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
        if (!active) { stream.getTracks().forEach((track) => track.stop()); return; }
        if (videoRef.current) videoRef.current.srcObject = stream;
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) {
          setMessage('Could not start the camera scanner. Use lot search to open a code instead.');
          return;
        }
        setMessage('Point the camera at a lot QR code.');
        const scanFrame = (now: number) => {
          const video = videoRef.current;
          if (!active) return;
          if (now - lastScanAt >= 160 && video && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0) {
            lastScanAt = now;
            const scale = Math.min(1, 720 / video.videoWidth);
            canvas.width = Math.round(video.videoWidth * scale);
            canvas.height = Math.round(video.videoHeight * scale);
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            const image = context.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(image.data, image.width, image.height, { inversionAttempts: 'dontInvert' });
            if (code?.data) {
              onDetectedRef.current(code.data);
              return;
            }
          }
          frameId = window.requestAnimationFrame(scanFrame);
        };
        frameId = window.requestAnimationFrame(scanFrame);
      } catch (error) {
        setMessage(error instanceof Error ? `Camera unavailable: ${error.message}` : 'Camera permission was not granted.');
      }
    };
    void start();
    return () => {
      active = false;
      window.cancelAnimationFrame(frameId);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="scanner-dialog" role="dialog" aria-modal="true" aria-labelledby="scanner-title">
      <div className="panel-title-row"><div><div className="eyebrow">Device camera</div><h3 id="scanner-title">Scan a lot QR code</h3></div><button className="drawer-close" onClick={onClose} aria-label="Close scanner">×</button></div>
      <video ref={videoRef} className="scanner-video" autoPlay playsInline muted aria-label="Camera preview for scanning a QR code" />
      <p role="status">{message}</p>
      <small>Camera access requires permission and a secure browser context. You can also search by lot code at the top of the page.</small>
    </section>
  </div>;
}
