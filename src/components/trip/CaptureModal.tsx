import { useEffect, useRef, useState } from "react";
import { Camera, FlipHorizontal2, X, Check, SwitchCamera } from "lucide-react";
import { captureVideoFrame } from "../../lib/tripPhotos";

interface CaptureModalProps {
  open: boolean;
  onClose: () => void;
  onCaptured: (payload: { backImage: string; frontImage?: string }) => void;
}

export default function CaptureModal({ open, onClose, onCaptured }: CaptureModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [error, setError] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  const [step, setStep] = useState<"live" | "review">("live");

  useEffect(() => {
    if (!open) {
      stopStream();
      setBackImage(null);
      setFrontImage(null);
      setStep("live");
      setError(null);
      setFacing("environment");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setError(null);
        stopStream();
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facing },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
      } catch {
        setError(
          "No pudimos acceder a la cámara. Revisa los permisos del navegador o importa desde la galería."
        );
      }
    })();

    return () => {
      cancelled = true;
      stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- restart only when open/facing change
  }, [open, facing]);

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  const handleShutter = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    setFlash(true);
    setTimeout(() => setFlash(false), 160);
    const frame = captureVideoFrame(video);

    if (!backImage) {
      setBackImage(frame);
      // Switch to front for BeReal-style second shot when possible
      setFacing("user");
      return;
    }

    setFrontImage(frame);
    setStep("review");
    stopStream();
  };

  const handleSkipFront = () => {
    if (!backImage) return;
    setStep("review");
    stopStream();
  };

  const handleConfirm = () => {
    if (!backImage) return;
    onCaptured({ backImage, frontImage: frontImage || undefined });
    onClose();
  };

  const handleRetake = () => {
    setBackImage(null);
    setFrontImage(null);
    setStep("live");
    setFacing("environment");
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-[#240046]/55 backdrop-blur-sm p-0 sm:p-6">
      <div className="w-full sm:max-w-md bg-[#0f172a] sm:rounded-[2rem] rounded-t-[2rem] overflow-hidden shadow-2xl relative animate-fade-in">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <p className="font-mono text-[9px] tracking-[0.14em] uppercase text-white/60 font-bold">
            {!backImage ? "Cámara trasera" : step === "live" ? "Selfie frontal" : "Revisar"}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-white/70 hover:bg-white/10 cursor-pointer"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="relative aspect-[3/4] bg-black">
          {step === "live" && (
            <>
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className="absolute inset-0 w-full h-full object-cover"
              />
              {flash && <div className="absolute inset-0 bg-white/90 pointer-events-none" />}
              {backImage && (
                <img
                  src={backImage}
                  alt=""
                  className="absolute top-3 left-3 w-20 h-28 object-cover rounded-xl border-2 border-white shadow-lg"
                />
              )}
            </>
          )}

          {step === "review" && backImage && (
            <div className="absolute inset-0">
              <img src={backImage} alt="" className="w-full h-full object-cover" />
              {frontImage && (
                <img
                  src={frontImage}
                  alt=""
                  className="absolute top-4 right-4 w-24 h-32 object-cover rounded-2xl border-2 border-white shadow-xl"
                />
              )}
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
              <p className="text-sm text-white/80 font-sans font-light leading-relaxed">{error}</p>
            </div>
          )}
        </div>

        <div className="px-4 py-5 flex items-center justify-center gap-5">
          {step === "live" && !error && (
            <>
              <button
                type="button"
                onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}
                className="p-3 rounded-full bg-white/10 text-white cursor-pointer"
                title="Cambiar cámara"
              >
                <SwitchCamera className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={handleShutter}
                className="w-16 h-16 rounded-full border-4 border-white bg-white/20 flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
                aria-label="Tomar foto"
              >
                <span className="w-12 h-12 rounded-full bg-white" />
              </button>
              {backImage ? (
                <button
                  type="button"
                  onClick={handleSkipFront}
                  className="p-3 rounded-full bg-white/10 text-white/80 text-[10px] font-mono uppercase tracking-wider cursor-pointer"
                >
                  Saltar
                </button>
              ) : (
                <div className="w-11" />
              )}
            </>
          )}

          {step === "review" && (
            <>
              <button
                type="button"
                onClick={handleRetake}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/10 text-white text-xs font-sans cursor-pointer"
              >
                <FlipHorizontal2 className="w-4 h-4" />
                Repetir
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-teal-500 text-white text-xs font-sans font-medium cursor-pointer"
              >
                <Check className="w-4 h-4" />
                Guardar en mapa
              </button>
            </>
          )}

          {error && (
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/15 text-white text-xs cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              Cerrar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
