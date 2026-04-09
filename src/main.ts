import './app.css';
import ArtBusinessAgent from './ArtBusinessAgent.svelte';
import { mount } from 'svelte';

const app = mount(ArtBusinessAgent, {
  target: document.getElementById('app')!,
});

export default app;
