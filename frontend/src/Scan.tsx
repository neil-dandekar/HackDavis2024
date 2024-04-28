import "./Scan.css";
import { useState, useRef, useEffect } from "react";

const Scan = ({ onCaptureDone }) => {
  const [image, setImage] = useState<string>("");
  const [prediction, setPrediction] = useState<string>("None");
  const [bintype, setBintype] = useState<string>("None");
  const [captured, setCaptured] = useState<boolean>(false); // Adjusted the name for clarity
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera(); // Ensures the camera is stopped when the component unmounts
    };
  }, []);

  const startCamera = () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: "environment" } })
        .then((mediaStream) => {
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
          }
        })
        .catch((error) => {
          console.error("Error accessing the camera:", error);
        });
    }
  };

  const capture = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (canvas && video) {
      const context = canvas.getContext("2d");
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const base64image = canvas.toDataURL("image/jpeg");
        setImage(base64image);
        setCaptured(true); // Set captured state to true to switch UI
        sendToBackend(base64image);
      }
    }
  };

  const sendToBackend = (base64image: string) => {
    fetch("http://127.0.0.1:8000/api/classify/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ image: base64image }),
    })
      .then((response) => response.json())
      .then((data) => {
        setPrediction(data.prediction);
        let bin: string;
        switch (data.prediction) {
          case "glass":
          case "cardboard":
          case "plastic":
          case "metal":
            bin = "recyclable";
            break;
          case "trash":
            bin = "landfill";
            break;
          case "paper":
            bin = "compostable";
            break;
          default:
            bin = "unknown";
            break;
        }
        setBintype(bin);
      })
      .catch((error) => {
        console.error("Error:", error);
        setPrediction("Error in prediction");
        setBintype("Error determining bin type");
      });
  };

  const stopCamera = () => {
    const tracks =
      videoRef.current?.srcObject instanceof MediaStream
        ? videoRef.current.srcObject.getTracks()
        : [];
    tracks.forEach((track) => track.stop());
  };

  return (
    <>
      <div className="scanctr">
        {!captured ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              style={{ width: "100%", height: "auto" }}
            ></video>
            <button onClick={capture}>Capture</button>
          </>
        ) : (
          <>
            <img
              src={image}
              alt="Captured"
              style={{ width: "100%", height: "auto" }}
            />
            <div>
              Prediction: {prediction}, Bin Type: {bintype}
            </div>
            <button onClick={onCaptureDone}>Map</button>{" "}
            {/* This button will switch to the Map view */}
          </>
        )}
        <canvas
          ref={canvasRef}
          style={{ display: "none" }}
          width="640"
          height="480"
        ></canvas>
      </div>
    </>
  );
};

export default Scan;
