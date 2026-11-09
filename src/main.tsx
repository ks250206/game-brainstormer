import { createRoot, hydrateRoot } from 'react-dom/client';
import '@astryxdesign/core/reset.css';
import '@astryxdesign/core/astryx.css';
import '@astryxdesign/theme-neutral/theme.css';
import '@xyflow/react/dist/style.css';
import './styles.css';
import App from './App.tsx';
const root = document.getElementById('root');
if (!root)
    throw new Error('Root element is missing.');
if (root.dataset.ssg === 'true')
    hydrateRoot(root, <App />);
else
    createRoot(root).render(<App />);
