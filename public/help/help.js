for (const button of document.querySelectorAll("[data-copy]")) {
  button.addEventListener("click", async () => {
    const target = document.getElementById(button.dataset.copy);
    const text = target ? target.innerText.trim() : "";

    try {
      await navigator.clipboard.writeText(text);
      button.textContent = "복사됨";
      window.setTimeout(() => {
        button.textContent = "복사";
      }, 1200);
    } catch {
      button.textContent = "직접 복사";
    }
  });
}
