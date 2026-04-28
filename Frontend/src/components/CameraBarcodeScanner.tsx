import type { BarcodeFormat as ZxingBarcodeFormat, IScannerControls } from "@zxing/browser";
import { useEffect, useRef, useState } from "react";

export type BarcodeScanTarget = "bookBarcode" | "managementBarcode";

type CameraBarcodeScannerProps = {
  onScan: (value: string, target: BarcodeScanTarget) => void;
};

export function CameraBarcodeScanner({ onScan }: CameraBarcodeScannerProps) {
  const controlsRef = useRef<IScannerControls | null>(null);
  const targetRef = useRef<BarcodeScanTarget>("bookBarcode");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScannedValue, setLastScannedValue] = useState<string | null>(null);
  const [target, setTarget] = useState<BarcodeScanTarget>("bookBarcode");

  useEffect(() => {
    return () => stopScanner();
  }, []);

  useEffect(() => {
    targetRef.current = target;
  }, [target]);

  async function startScanner() {
    setErrorMessage(null);
    setLastScannedValue(null);

    if (!window.isSecureContext) {
      setErrorMessage("カメラ読み取りにはHTTPSまたはlocalhostなどの安全なコンテキストが必要です。");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || !videoRef.current) {
      setErrorMessage("このブラウザではカメラ入力を利用できません。手入力またはキーボード型リーダーを使ってください。");
      return;
    }

    try {
      const reader = await createCodeReader();
      setIsScanning(true);

      controlsRef.current = await reader.decodeFromConstraints(
        {
          audio: false,
          video: {
            facingMode: { ideal: "environment" }
          }
        },
        videoRef.current,
        (result) => {
          const value = result?.getText().trim();

          if (value) {
            setLastScannedValue(value);
            onScan(value, targetRef.current);
            stopScanner();
          }
        }
      );
    } catch (error) {
      stopScanner();
      setErrorMessage(formatCameraError(error));
    }
  }

  function stopScanner() {
    controlsRef.current?.stop();
    controlsRef.current = null;

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

async function createCodeReader() {
  const { BarcodeFormat, BrowserMultiFormatReader } = await import("@zxing/browser");
  const reader = new BrowserMultiFormatReader();
  const barcodeFormats = [
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
    BarcodeFormat.UPC_A,
    BarcodeFormat.UPC_E,
    BarcodeFormat.CODE_128,
    BarcodeFormat.CODE_39,
    BarcodeFormat.CODE_93,
    BarcodeFormat.CODABAR,
    BarcodeFormat.ITF,
    BarcodeFormat.QR_CODE
  ] satisfies ZxingBarcodeFormat[];

  reader.possibleFormats = barcodeFormats;

  return reader;
}
