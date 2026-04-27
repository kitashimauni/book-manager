import { useEffect, useRef, useState } from "react";

export type BarcodeScanTarget = "bookBarcode" | "managementBarcode";

type CameraBarcodeScannerProps = {
  onScan: (value: string, target: BarcodeScanTarget) => void;
};

const barcodeFormats = [
  "ean_13",
  "ean_8",
  "upc_a",
  "upc_e",
  "code_128",
  "code_39",
  "code_93",
  "codabar",
  "itf",
  "qr_code"
];

export function CameraBarcodeScanner({ onScan }: CameraBarcodeScannerProps) {
  const frameRef = useRef<number | null>(null);
  const isScanningRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScannedValue, setLastScannedValue] = useState<string | null>(null);
  const [target, setTarget] = useState<BarcodeScanTarget>("bookBarcode");

  useEffect(() => {
    return () => stopScanner();
  }, []);

  async function startScanner() {
    setErrorMessage(null);
    setLastScannedValue(null);

    if (!window.isSecureContext) {
      setErrorMessage("カメラ読み取りにはHTTPSまたはlocalhostなどの安全なコンテキストが必要です。");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMessage("このブラウザではカメラ入力を利用できません。手入力またはキーボード型リーダーを使ってください。");
      return;
    }

    if (!window.BarcodeDetector) {
      setErrorMessage("このブラウザではBarcodeDetector APIを利用できません。手入力またはキーボード型リーダーを使ってください。");
      return;
    }

    try {
      const detector = createBarcodeDetector(window.BarcodeDetector);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" }
        }
      });

      streamRef.current = stream;
      isScanningRef.current = true;
      setIsScanning(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      scanFrame(detector);
    } catch (error) {
      stopScanner();
      setErrorMessage(formatCameraError(error));
    }
  }

  async function scanFrame(detector: BarcodeDetector) {
    if (!isScanningRef.current) {
      return;
    }

    const video = videoRef.current;

    if (video && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      try {
        const detectedBarcodes = await detector.detect(video);
        const value = detectedBarcodes[0]?.rawValue.trim();

        if (value) {
          setLastScannedValue(value);
          onScan(value, target);
          stopScanner();
          return;
        }
      } catch {
        setErrorMessage("バーコードの読み取りに失敗しました。角度や明るさを変えて再試行してください。");
      }
    }

    frameRef.current = window.requestAnimationFrame(() => void scanFrame(detector));
  }

  function stopScanner() {
    isScanningRef.current = false;

    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    for (const track of streamRef.current?.getTracks() ?? []) {
      track.stop();
    }

    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsScanning(false);
  }

  return (
    <section className="camera-scanner" aria-label="カメラバーコード読み取り">
      <div className="scanner-heading">
        <div>
          <p className="eyebrow">Camera Scan</p>
          <h4>カメラで読み取る</h4>
        </div>
        {isScanning ? (
          <button className="button-secondary" onClick={stopScanner} type="button">
            停止
          </button>
        ) : (
          <button className="button-primary" onClick={() => void startScanner()} type="button">
            カメラを起動
          </button>
        )}
      </div>

      <div className="scanner-targets" aria-label="読み取り結果の入力先">
        <label>
          <input
            checked={target === "bookBarcode"}
            onChange={() => setTarget("bookBarcode")}
            type="radio"
          />
          <span>本のバーコードへ入力</span>
        </label>
        <label>
          <input
            checked={target === "managementBarcode"}
            onChange={() => setTarget("managementBarcode")}
            type="radio"
          />
          <span>管理用バーコードへ入力</span>
        </label>
      </div>

      <div className={isScanning ? "scanner-preview active" : "scanner-preview"}>
        <video muted playsInline ref={videoRef} />
        <span className="scanner-reticle" />
      </div>

      <p className="subtle-text">
        対応ブラウザのHTTPSまたはlocalhost環境で利用できます。手入力やキーボード型バーコードリーダーもそのまま使えます。
      </p>

      {lastScannedValue ? <p className="inline-message">読み取り結果: {lastScannedValue}</p> : null}
      {errorMessage ? <p className="scanner-error">{errorMessage}</p> : null}
    </section>
  );
}

function createBarcodeDetector(BarcodeDetectorConstructor: BarcodeDetectorConstructor) {
  try {
    return new BarcodeDetectorConstructor({ formats: barcodeFormats });
  } catch {
    return new BarcodeDetectorConstructor();
  }
}

function formatCameraError(error: unknown) {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError") {
      return "カメラの利用が許可されませんでした。ブラウザの権限設定を確認してください。";
    }

    if (error.name === "NotFoundError") {
      return "利用できるカメラが見つかりませんでした。";
    }
  }

  return "カメラを起動できませんでした。HTTPS、ブラウザ対応、カメラ権限を確認してください。";
}
