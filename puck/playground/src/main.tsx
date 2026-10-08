import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// No Nimbus provider here on purpose: this app is a plain Tailwind consumer.
// Each puck package self-wraps its own (reset-isolated) Nimbus provider, so the
// only Nimbus context in play comes from inside the puck packages themselves —
// exactly like a real host app that just drops the puck packages in.

const root = document.getElementById('root');
if (!root) throw new Error('#root element not found');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);
