import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import App from './app';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ErrorBoundary fallbackRender={({ resetErrorBoundary }) => (
        <main className="mx-auto max-w-lg p-8 text-center">
          <h1 className="text-2xl font-semibold">页面暂时未能打开</h1>
          <p className="my-4">请重试，或返回首页继续选茶。你的模型密钥不会显示在此处。</p>
          <button className="rounded-lg bg-primary px-4 py-2 text-primary-foreground" onClick={resetErrorBoundary}>重新加载</button>
        </main>
      )}>
        <App />
      </ErrorBoundary>
    </BrowserRouter>
  </StrictMode>,
);
