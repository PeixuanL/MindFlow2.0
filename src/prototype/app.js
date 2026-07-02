import { organizeThoughts } from "./organizer.mjs";

const input = document.querySelector("#thought-input");
const organizeButton = document.querySelector("#organize-button");
const statusMessage = document.querySelector("#status-message");
const suggestionSection = document.querySelector("#suggestion-section");
const addMoreSection = document.querySelector("#add-more-section");
const suggestionLabel = document.querySelector("#suggestion-label");
const suggestionTitle = document.querySelector("#suggestion-title");
const suggestionReason = document.querySelector("#suggestion-reason");
const lookButton = document.querySelector("#look-button");
const skipButton = document.querySelector("#skip-button");

function renderResult(result) {
  statusMessage.textContent = result.message;

  if (result.status === "empty") {
    suggestionSection.classList.add("is-hidden");
    addMoreSection.classList.add("is-hidden");
    input.focus();
    return;
  }

  suggestionLabel.textContent = result.suggestion.label;
  suggestionTitle.textContent = result.suggestion.title;
  suggestionReason.textContent = result.suggestion.reason;
  suggestionSection.classList.remove("is-hidden");
  addMoreSection.classList.remove("is-hidden");
}

organizeButton.addEventListener("click", () => {
  renderResult(organizeThoughts(input.value));
});

lookButton.addEventListener("click", () => {
  statusMessage.textContent = "可以只看这一件。其他想法都还在。";
});

skipButton.addEventListener("click", () => {
  statusMessage.textContent = "先不管也可以。其他想法都还在。";
});
