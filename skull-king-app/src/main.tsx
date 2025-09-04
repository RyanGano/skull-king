import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App.tsx";
import "./index.less";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/:gameId" element={<App />} />
        <Route path="/:gameId/:playerId" element={<App />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
