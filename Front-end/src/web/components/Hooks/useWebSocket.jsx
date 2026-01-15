import { useEffect, useState } from "react";
import { supabase } from "../../../supabase";

const useWebSocket = (baseUrl) => {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    let ws;

    const connectWithToken = async () => {
      let token = null;

      for (let i = 0; i < 5; i++) {
        const { data: { session } } = await supabase.auth.getSession();
        token = session?.access_token;

        if (token) break;
        console.warn("🔁 Waiting for Supabase session...");
        await new Promise((res) => setTimeout(res, 1000));
      }

      if (!token) {
        console.error("❌ No valid Supabase token available.");
        return;
      }

      ws = new WebSocket(`ws://127.0.0.1:5000/ws?token=${token}`);

      ws.onopen = () => console.log("✅ WebSocket connected");

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log("📩 WebSocket message:", message);
          setMessages((prev) => [...prev, message]);
        } catch (err) {
          console.error("❌ WebSocket message parse error:", event.data);
        }
      };

      ws.onerror = (err) => console.error("WebSocket error:", err);

      ws.onclose = () => {
        console.warn("⚠️ WebSocket closed. Retrying in 5s...");
        setTimeout(connectWithToken, 5000);
      };

      setSocket(ws);
    };

    connectWithToken();

    return () => {
      if (ws) ws.close();
    };
  }, [baseUrl]);

  return { messages };
};

export default useWebSocket;
