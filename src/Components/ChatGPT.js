import { useState } from "react";
import axios from "axios";

const ChatGPT = () => {
  const [input, setInput] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAskAI = async () => {
    if (!input.trim()) return;

    setLoading(true);
    try {
      const res = await axios.post("http://localhost:5001/api/ChatGPT", { message: input });

      console.log("🟢 Response from Backend:", res.data);

      setResponse(res.data.reply || "No response from AI.");
    } catch (error) {
      console.error("Error fetching from ChatGPT:", error);

      if (error.response) {
        console.error("❌ Server Error:", error.response.data);
    }

      setResponse("Error getting response.");
    }
    setLoading(false);
  };

  return (
    <div className="p-4 bg-gray-200 rounded-lg shadow-md h-60 flex flex-col justify-between">
      <input
        type="text"
        className="w-full p-2 border rounded-md"
        placeholder="Ask something..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />
      <button
        className="mt-2 p-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
        onClick={handleAskAI}
        disabled={loading}
      >
        {loading ? "Thinking..." : "Ask AI"}
      </button>
      <p className="mt-2 text-gray-700">{response}</p>
    </div>
  );
};

export default ChatGPT;
