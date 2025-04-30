import * as React from 'react';
import './App.css';
import { createRoot } from 'react-dom/client';

const root = createRoot(document.body);

function App() {
    return (
      <div className="App">
        <div className="App-header">
          <h2>Welcome to React</h2>
        </div>
        <p className="App-intro">
          To get started, edit <code>src/App.tsx</code> and save to reload.
        </p>
      </div>
    );
  }

root.render(App());