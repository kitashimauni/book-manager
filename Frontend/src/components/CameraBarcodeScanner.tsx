import { createPortal } from "react-dom";
import type { KeyboardEvent } from "react";
import { useEffect, useRef, useState } from "react";
import type { BarcodeFormat as ZxingBarcodeFormat, IScannerControls } from "@zxing/browser";

export type BarcodeScanTarget = "bookBarcode" | "managementBarcode";

type CameraBarcodeScannerProps = {
  onScan: (value: string, target: BarcodeScanTarget) => void;
};

const FOCUSABLE_ELEMENT_SELECTOR =
  'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

export function CameraBarcodeScanner({ onScan }: CameraBarcodeScannerProps) {
  const controlsRef = useRef<IScannerControls | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const isMountedRef = useRef(false);
  const scanSessionRef = useRef(0);
  const targetRef = useRef<BarcodeScanTarget>("bookBarcode");
  const triggerButtonRef = useRef<HTMLButtonElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [lastScannedValue, setLastScannedValue] = useState<string | null>(null);
  const [target, setTarget] = useState<BarcodeScanTarget>("bookBarcode");

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      stopScanner();
    };
  }, []);

  useEffect(() => {
    targetRef.current = target;
  }, [target]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousActiveElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    void startScanner();

    return () => {
      stopScanner();
      document.body.style.overflow = previousOverflow;

      if (previousActiveElement?.isConnected) {
        previousActiveElement.focus();
      } else {
        triggerButtonRef.current?.focus();
      }
    };
  }, [isOpen]);

  function openScanner() {
    setErrorMessage(null);
    setLastScannedValue(null);
    setIsOpen(true);
  }

  function closeScanner() {
    stopScanner();
    setIsOpen(false);
  }

  function stopScanner() {
    scanSessionRef.current += 1;
    controlsRef.current?.stop();
    controlsRef.current = null;

    const mediaSource = videoRef.current?.srcObject;
    if (mediaSource && typeof mediaSource === "object" && "getTracks" in mediaSource) {
      for (const track of (mediaSource as MediaStream).getTracks()) {
        track.stop();
      }
    }

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }

    if (isMountedRef.current) {
      setIsScanning(false);
      setIsStarting(false);
    }
  }

  async function startScanner() {
    const session = scanSessionRef.current + 1;
    scanSessionRef.current = session;
    setErrorMessage(null);
    setLastScannedValue(null);
    setIsStarting(true);
    setIsScanning(false);

    if (!window.isSecureContext) {
      failToStart(session, "カメラ読み取りにはHTTPSまたはlocalhostなどの安全なコンテキストが必要です。");
      return;
    }

    const videoElement = videoRef.current;
    if (!navigator.mediaDevices?.getUserMedia || !videoElement) {
      failToStart(session, "このブラウザではカメラ入力を利用できません。手入力またはキーボード型リーダーを使ってください。");
      return;
    }

    try {
      const reader = await createCodeReader();
      if (!isSessionActive(session)) {
        return;
      }

      const controls = await reader.decodeFromConstraints(
        {
          audio: false,
          video: {
            facingMode: { ideal: "environment" }
          }
        },
        videoElement,
        (result) => {
          if (!isSessionActive(session)) {
            return;
          }

          const value = result?.getText().trim();
          if (!value) {
            return;
          }

          setLastScannedValue(value);
          onScan(value, targetRef.current);
          stopScanner();
          setIsOpen(false);
        }
      );

      if (!isSessionActive(session)) {
        controls.stop();
        return;
      }

      controlsRef.current = controls;
      setIsStarting(false);
      setIsScanning(true);
    } catch (error) {
      if (!isSessionActive(session)) {
        return;
      }

      stopScanner();
      setErrorMessage(formatCameraError(error));
    }
  }

  function failToStart(session: number, message: string) {
    if (!isSessionActive(session)) {
      return;
    }

    stopScanner();
    setErrorMessage(message);
  }

  function isSessionActive(session: number) {
    return isMountedRef.current && isOpen && scanSessionRef.current === session;
  }

  function handleDialogKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeScanner();
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    const focusableElements = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_ELEMENT_SELECTOR));
    if (focusableElements.length === 0) {
      event.preventDefault();
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    const activeElement = document.activeElement;

    if (event.shiftKey && (activeElement === firstElement || activeElement === dialog)) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }

  const modal = isOpen && typeof document !== "undefined"
    ? createPortal(
        <div
          className="scanner-modal"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeScanner();
            }
          }}
        >
          <div
            aria-describedby="camera-scanner-description"
            aria-labelledby="camera-scanner-title"
            aria-modal="true"
            className="scanner-dialog"
            onKeyDown={handleDialogKeyDown}
            ref={dialogRef}
            role="dialog"
            tabIndex={-1}
          >
            <div className="scanner-heading">
              <div>
                <p className="eyebrow">Camera Scan</p>
                <h4 id="camera-scanner-title">カメラで読み取る</h4>
              </div>
              <button
                aria-label="カメラ読み取りをキャンセルして閉じる"
                className="button-secondary"
                onClick={closeScanner}
                type="button"
              >
                キャンセル
              </button>
            </div>

            <p className="subtle-text" id="camera-scanner-description">
              読み取り結果の入力先を選び、バーコードを枠内に合わせてください。
            </p>

            <fieldset className="scanner-targets">
              <legend>読み取り結果の入力先</legend>
              <label>
                <input
                  checked={target === "bookBarcode"}
                  onChange={() => {
                    targetRef.current = "bookBarcode";
                    setTarget("bookBarcode");
                  }}
                  type="radio"
                />
                <span>本のバーコードへ入力</span>
              </label>
              <label>
                <input
                  checked={target === "managementBarcode"}
                  onChange={() => {
                    targetRef.current = "managementBarcode";
                    setTarget("managementBarcode");
                  }}
                  type="radio"
                />
                <span>管理用バーコードへ入力</span>
              </label>
            </fieldset>

            <div className={isScanning || isStarting ? "scanner-preview active" : "scanner-preview"}>
              <video aria-label="バーコードカメラプレビュー" autoPlay muted playsInline ref={videoRef} />
              <span aria-hidden="true" className="scanner-reticle" />
              {isStarting ? <span className="scanner-preview-status">カメラを起動しています…</span> : null}
            </div>

            {errorMessage ? (
              <p className="scanner-error" role="alert">
                {errorMessage}
              </p>
            ) : null}
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <section aria-label="カメラバーコード読み取り" className="camera-scanner">
      <div className="scanner-heading">
        <div>
          <p className="eyebrow">Camera Scan</p>
          <h4>カメラで読み取る</h4>
        </div>
        <button
          aria-haspopup="dialog"
          className="button-primary"
          onClick={openScanner}
          ref={triggerButtonRef}
          type="button"
        >
          カメラで読み取る
        </button>
      </div>

      <p className="subtle-text">
        必要なときだけカメラを起動します。HTTPSまたはlocalhost環境で利用でき、手入力やキーボード型バーコードリーダーもそのまま使えます。
      </p>

      {lastScannedValue ? (
        <p className="inline-message" role="status">
          読み取り結果: {lastScannedValue}
        </p>
      ) : null}
      {!isOpen && errorMessage ? (
        <p className="scanner-error" role="alert">
          {errorMessage}
        </p>
      ) : null}
      {modal}
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
