(function () {
  const BASE_URL = "https://supportkori.com"
  const username = "theabmmohi"
  const message  = "CupHi?"
  const style = document.createElement("style")
  style.innerHTML = `
    .sk-button {
      box-shadow: 0 4px 12px rgba(0,0,0,0.125);
      transition: transform 250ms;
      font-family: sans-serif;
      text-decoration: none;
      border-radius: 50px;
      align-items: center;
      background: #FFDD00;
      padding: 10px 16px;
      font-weight: bold;
      position: fixed;
      z-index: 999998;
      font-size: 14px;
      cursor: pointer;
      color: #000000;
      display: flex;
      bottom: 20px;
      gap: 8px;
      &:hover { transform: scale(1.05); }
      & svg {
        height: 20px;
        width: 20px;
      }
    }
    .sk-iframe-container {
      box-shadow: 0 10px 40px rgba(0,0,0,0.25);
      transform: translateY(20px);
      transition: all 250ms ease;
      pointer-events: none;
      border-radius: 16px;
      position: fixed;
      z-index: 999999;
      height: 550px;
      bottom: 80px;
      width: 350px;
      opacity: 0;
      &.open {
        transform: translateY(0);
        pointer-events: all;
        opacity: 1;
      }
      .sk-iframe {
        border-radius: 16px;
        border: none;
        height: 100%;
        width: 100%;
      }
    }`
  document.head.appendChild(style)
  const iframe = document.createElement("div")
  const button = document.createElement("div")
  iframe.className = "sk-iframe-container"
  button.className = "sk-button"
  button.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line></svg><span>${message}</span>`
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line></svg><span>${message}</span>`
  iframe.innerHTML = `<iframe src="${BASE_URL}/widget/${username}" class="sk-iframe"></iframe>`
  document.body.appendChild(button)
  document.body.appendChild(iframe)
  let isOpen = false
  button.onclick = () => {
    isOpen = !isOpen
    iframe.classList.toggle("open", isOpen)
  }
  window.addEventListener("message", (e) => {
    if (e.data === "close-sk-widget") {
      isOpen = false
      iframe.classList.remove("open")
    }
  })
})()