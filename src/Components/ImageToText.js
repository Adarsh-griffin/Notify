import { useState, useRef } from "react";
import axios from "axios";

const ImageToText = () => {
  const [file, setFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [text, setText] = useState("");
  const [enhancedText, setEnhancedText] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef(null);
  const [showCamera, setShowCamera] = useState(false);

  const handleImageUpload = (event) => {
    const uploaded = event.target.files[0];
    if (uploaded) {
      setFile(uploaded);
      setImagePreview(URL.createObjectURL(uploaded));
      setText("");
      setEnhancedText("");
      setProgress(0);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;
      setShowCamera(true);
    } catch (err) {
      alert("Could not access camera: " + err.message);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
    setShowCamera(false);
  };

  const takePhoto = () => {
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
    
    canvas.toBlob((blob) => {
      setFile(blob);
      setImagePreview(URL.createObjectURL(blob));
      setText("");
      setEnhancedText("");
      setProgress(0);
      stopCamera();
    }, 'image/jpeg');
  };

  const extractText = async () => {
    if (!file) return alert("Please upload an image first.");
    setLoading(true);
    setProgress(0);

    try {
      // Using OCR.space API
      const formData = new FormData();
      formData.append('file', file);
      formData.append('language', 'eng');
      formData.append('isOverlayRequired', 'false');
      formData.append('OCREngine', '2'); // Engine 2 is more accurate

      const response = await axios.post(
        'https://api.ocr.space/parse/image',
        formData,
        {
          headers: {
            'apikey': import.meta.env.VITE_OCR_API_KEY,

            'Content-Type': 'multipart/form-data'
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setProgress(percentCompleted);
          }
        }
      );

      if (response.data.IsErroredOnProcessing) {
        throw new Error(response.data.ErrorMessage);
      }

      const extractedText = response.data.ParsedResults?.[0]?.ParsedText || "";
      setText(extractedText.trim());
    } catch (error) {
      console.error(error);
      setText("Error extracting text: " + error.message);
    }
    setLoading(false);
  };

  const enhanceText = async () => {
    if (!text) return alert("No text to enhance!");
    setAiLoading(true);
    try {
      // Using a generic AI API endpoint (you can replace with your preferred service)
      const response = await axios.post(
        "https://api-inference.huggingface.co/models/facebook/bart-large-cnn",
        { inputs: text },
        {
          headers: {
            "Authorization": `Bearer ${import.meta.env.VITE_HUGGINGFACE_API_KEY}`
, // Replace with your key
          },
        }
      );
      
      setEnhancedText(response.data[0].summary_text || "No enhancement available");
    } catch (error) {
      console.error(error);
      // Fallback to simple text processing if API fails
      setEnhancedText(text.replace(/\s+/g, ' ').replace(/(\r\n|\n|\r)/gm, " ").trim());
    }
    setAiLoading(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(enhancedText || text);
    alert("Text copied to clipboard!");
  };

  const toggleFullscreen = () => {
    setFullscreen((prev) => {
      const newState = !prev;
      if (!prev) setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 100);
      return newState;
    });
  };

  return (
    <div
      className={`relative p-4 bg-gray-100 rounded-lg shadow-md flex flex-col space-y-4 ${
        fullscreen ? "fixed inset-0 z-50 bg-white overflow-auto" : "max-w-xl mx-auto"
      } transition-all duration-300`}
    >
      {/* Fullscreen Toggle Button */}
      {!fullscreen && (
        <button
          onClick={toggleFullscreen}
          className="absolute top-2 right-2 text-xl p-2 rounded-full hover:bg-gray-200"
          title="Expand to Fullscreen"
        >
          ⛶
        </button>
      )}

      {/* Close Fullscreen Button */}
      {fullscreen && (
        <button
          onClick={toggleFullscreen}
          className="absolute top-2 right-2 text-xl p-2 rounded-full bg-red-100 text-red-600 hover:bg-red-200"
          title="Exit Fullscreen"
        >
          ✕
        </button>
      )}

      <div className="flex items-center space-x-2">
        <label className="flex-1 relative">
          <input
            type="file"
            accept="image/*"
            className="w-full p-2 border rounded-md opacity-0 absolute"
            onChange={handleImageUpload}
            capture="environment"
          />
          <div className="p-2 bg-blue-500 text-white rounded-md text-center cursor-pointer hover:bg-blue-600">
            Choose File
          </div>
        </label>
        
        {navigator.mediaDevices && navigator.mediaDevices.getUserMedia && (
          <button
            onClick={showCamera ? stopCamera : startCamera}
            className="p-2 bg-blue-500 text-white rounded-md flex items-center justify-center"
            title={showCamera ? "Stop Camera" : "Use Camera"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>

      {showCamera && (
        <div className="relative">
          <video ref={videoRef} autoPlay playsInline className="w-full h-auto border rounded-md" />
          <button
            onClick={takePhoto}
            className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white p-2 rounded-full shadow-lg"
          >
            📷
          </button>
        </div>
      )}

      {imagePreview && !showCamera && (
        <img
          src={imagePreview}
          alt="Preview"
          className="w-full h-52 object-cover rounded-md border"
        />
      )}

      <button
        onClick={extractText}
        className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center"
        disabled={loading}
      >
        {loading ? `Extracting... (${progress}%)` : "Extract Text"}
      </button>

      <textarea
        readOnly
        className="w-full p-2 h-40 border rounded-md bg-gray-50 text-black"
        value={text}
        placeholder="Extracted text..."
      />

      <button
        className="p-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-60"
        onClick={enhanceText}
        disabled={aiLoading}
      >
        {aiLoading ? "Enhancing..." : "Enhance Text"}
      </button>

      <textarea
        readOnly
        className="w-full p-2 h-40 border rounded-md bg-gray-50 text-black"
        value={enhancedText}
        placeholder="Enhanced text..."
      />

      <button
        className="p-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center justify-center space-x-2"
        onClick={copyToClipboard}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
          <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
        </svg>
        <span></span>
      </button>
    </div>
  );
};

export default ImageToText;