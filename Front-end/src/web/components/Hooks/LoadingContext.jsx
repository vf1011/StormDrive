import React, { createContext, useContext, useState } from "react";
import TornadoLoader from "../Animations/Loader/TornadoLoader"; // adjust path as needed

const LoadingContext = createContext();

export function LoadingProvider({ children }) {
  const [loading, setLoading] = useState(false);

  return (
    <LoadingContext.Provider value={{ loading, setLoading }}>
      {children}
      {loading && <TornadoLoader />}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  return useContext(LoadingContext);
}
