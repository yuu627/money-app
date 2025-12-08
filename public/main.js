// public/main.js

// サマリーカードをふわっと
document.addEventListener("DOMContentLoaded", () => {
  const cards = document.querySelectorAll(".summary-item");
  cards.forEach((card, i) => {
    card.style.transition = "transform 0.15s ease, box-shadow 0.15s ease";
    card.addEventListener("mouseenter", () => {
      card.style.transform = "translateY(-2px)";
      card.style.boxShadow = "0 14px 30px rgba(15,23,42,0.8)";
    });
    card.addEventListener("mouseleave", () => {
      card.style.transform = "translateY(0)";
      card.style.boxShadow = "none";
    });
  });
});
