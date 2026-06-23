import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

try {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (error) {
  console.error("App render failed:", error);
  rootElement.innerHTML = `<div style="padding: 20px; color: red;"><h3>系統載入發生錯誤</h3><p>請重新整理頁面，若問題持續請聯繫管理員。</p></div>`;
}
