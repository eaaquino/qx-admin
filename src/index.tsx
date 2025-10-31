import React from "react";
import { createRoot } from "react-dom/client";

import App from "./App";

// TODO: Suppress Ant Design warnings from Refine components and React 19 compatibility
// Will be fixed when Refine and Ant Design fully support React 19
const originalError = console.error;
console.error = (...args) => {
  if (typeof args[0] === 'string') {
    // Suppress Menu children deprecation warning from ThemedSider
    if (args[0].includes('`children` is deprecated. Please use `items` instead')) {
      return;
    }
    // Suppress useForm warning when form is created internally by Refine hooks but not used
    if (args[0].includes('Instance created by `useForm` is not connected to any Form element')) {
      return;
    }
    // Suppress React 19 compatibility warning (Ant Design v5 works with React 19 but shows this warning)
    if (args[0].includes('antd v5 support React is 16 ~ 18')) {
      return;
    }
  }
  originalError.apply(console, args);
};

const container = document.getElementById("root") as HTMLElement;
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
