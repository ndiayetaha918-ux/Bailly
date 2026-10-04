import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/index.css";
import { App } from "./App";
import { brand } from "./brand/brand";

const root = document.documentElement;
root.dataset.brand = brand.id;
document.title = brand.id === "bailly" ? "Bailly · Gestion locative" : brand.name;
document.querySelector('meta[name="theme-color"]')?.setAttribute("content", brand.themeColor);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
