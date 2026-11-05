import { useEffect, useId, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

// Turns the device camera into a QR reader. The camera reads ~10 frames a second, so
// one pass held in front of it would be "scanned" many times; we ignore a repeat of
// the same code within 4 seconds.
// Browsers allow the camera only on https:// pages or on http://localhost.
export default function QrScanner({ onScan }) {
  const regionId = `qr-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const onScanRef = useRef(onScan);
  const lastScan = useRef({ text: '', at: 0 });
  const [error, setError] = useState('');

  // Always call the latest onScan without restarting the camera when it changes.
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    const scanner = new Html5Qrcode(regionId, { verbose: false });

    const handleDecoded = (text) => {
      const now = Date.now();
      if (text === lastScan.current.text && now - lastScan.current.at < 4000) return;
      lastScan.current = { text, at: now };
      onScanRef.current(text);
    };

    const starting = scanner
      .start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 220, height: 220 } }, handleDecoded, () => {})
      .catch((err) => {
        const denied = String(err).includes('NotAllowed') || String(err).includes('Permission');
        setError(
          denied
            ? 'Camera access was blocked. Allow it in the browser address bar, or type the ID below.'
            : 'No camera found. Type the registration ID below instead.',
        );
      });

    // Cleanup runs when the camera is switched off or the page closes. start() is async,
    // so wait for it to finish before stopping, or stop() would fail.
    return () => {
      starting
        .then(() => (scanner.isScanning ? scanner.stop() : undefined))
        .then(() => scanner.clear())
        .catch(() => {});
    };
  }, [regionId]);

  return (
    <div className={`scanner${error ? ' scanner--error' : ''}`}>
      <div id={regionId} className="scanner__view" />
      {error && <p className="scanner__error">{error}</p>}
    </div>
  );
}
