/// <reference types="vite/client" />

type DetectedBarcode = {
  rawValue: string;
  format: string;
};

type BarcodeDetectorOptions = {
  formats?: string[];
};

interface BarcodeDetector {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
}

interface BarcodeDetectorConstructor {
  new (options?: BarcodeDetectorOptions): BarcodeDetector;
}

interface Window {
  BarcodeDetector?: BarcodeDetectorConstructor;
}
