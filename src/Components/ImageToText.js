import { useState } from "react";
import Tesseract from "tesseract.js";
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
  const [aiModel, setAiModel] = useState("deepseek-chat"); // Default to DeepSeek Chat

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

  const extractText = async () => {
    if (!file) return alert("Please upload an image first.");
    setLoading(true);
    setProgress(0);
    try {
      const { data } = await Tesseract.recognize(file, "eng+hin", {
        logger: (m) => {
          if (m.status === "recognizing text") {
            setProgress(Math.round(m.progress * 100));
          }
        },
      });
      setText(data.text.trim());
    } catch (error) {
      console.error(error);
      setText("Error extracting text.");
    }
    setLoading(false);
  };

  const enhanceText = async () => {
    if (!text) return alert("No text to enhance!");
    setAiLoading(true);
    try {
      const response = await axios.post(
        "https://api.deepseek.com/v1/chat/completions", // DeepSeek API endpoint
        {
          model: aiModel,
          messages: [
            {
              role: "system",
              content: "You are a helpful assistant that enhances extracted text from images. Correct any OCR errors, improve formatting, and make the text more readable while preserving the original meaning."
            },
            {
              role: "user",
              content: `Please enhance the following text extracted from an image:\n\n${text}\n\nCorrect any OCR errors, improve formatting, and make it more readable while preserving the original meaning.`
            }
          ],
          temperature: 0.3 // Lower temperature for more factual responses
        },
        {
          headers: {
            "Authorization": `Bearer sk-6ef353d4fdb74a00abc32fde5cf4eec6`, // Replace with your actual key
            "Content-Type": "application/json",
          },
        }
      );
      setEnhancedText(response.data.choices[0].message.content.trim());
    } catch (error) {
      console.error(error);
      setEnhancedText("Error in AI processing. Please try again.");
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

      <input
        type="file"
        accept="image/*"
        className="w-full p-2 border rounded-md"
        onChange={handleImageUpload}
      />

      {imagePreview && (
        <img
          src={imagePreview}
          alt="Preview"
          className="w-full h-52 object-cover rounded-md border"
        />
      )}

      <button
        onClick={extractText}
        className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-60"
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

      <div className="flex items-center space-x-2">
        <select
          value={aiModel}
          onChange={(e) => setAiModel(e.target.value)}
          className="p-2 border rounded-md flex-grow"
        >
          <option value="deepseek-chat">DeepSeek Chat</option>
          <option value="deepseek-coder">DeepSeek Coder (for code)</option>
        </select>
        
        <button
          className="p-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-60"
          onClick={enhanceText}
          disabled={aiLoading}
        >
          {aiLoading ? "Enhancing..." : "Enhance with AI"}
        </button>
      </div>

      <textarea
        readOnly
        className="w-full p-2 h-40 border rounded-md bg-gray-50 text-black"
        value={enhancedText}
        placeholder="Enhanced text..."
      />

      <button
        className="p-2 bg-green-600 text-white rounded-md hover:bg-green-700"
        onClick={copyToClipboard}
      >
        Copy to Clipboard
      </button>
    </div>
  );
};

export default ImageToText;