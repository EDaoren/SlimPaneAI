import OptionsApp from './OptionsApp.svelte';
import './style.css';
import 'uno.css';

const app = new OptionsApp({
  target: document.getElementById('app')!,
});

export default app;
