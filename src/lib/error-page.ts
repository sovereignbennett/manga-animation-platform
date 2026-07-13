export function renderErrorPage() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>MotionCut Studio</title>
    <style>
      :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #121218; color: #f5f5f7; }
      main { width: min(420px, calc(100vw - 32px)); text-align: center; }
      h1 { margin: 0 0 8px; font-size: 20px; }
      p { margin: 0; color: #a7a7b4; line-height: 1.5; font-size: 14px; }
      a { display: inline-flex; margin-top: 24px; color: #f5f5f7; text-decoration: none; border: 1px solid #3a3a46; border-radius: 8px; padding: 10px 14px; }
    </style>
  </head>
  <body>
    <main>
      <h1>MotionCut Studio did not load</h1>
      <p>Something went wrong while rendering the editor. Refresh the page or return home.</p>
      <a href="/">Go home</a>
    </main>
  </body>
</html>`;
}
