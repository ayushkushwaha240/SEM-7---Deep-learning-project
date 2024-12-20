// Content Script for Image Caption/Story Generator
(() => {
  // Backend URL (local backend)
  const apiUrl = "http://127.0.0.1:8000/generate/";

  // Default mode: "caption" or "story"
  let mode = "caption";

  // Hover delay time (in milliseconds)
  const hoverDelay = 1000; // 1 second buffer before starting to capture the input
  let hoverTimer = null; // Variable to store the timeout ID
  let currentImage = null; // Variable to store the current image being hovered over

  // Create a toggle button for user mode selection
  const toggleButton = document.createElement("button");
  toggleButton.innerText = `Mode: ${mode}`;
  toggleButton.style.position = "fixed";
  toggleButton.style.top = "10px";
  toggleButton.style.right = "10px";
  toggleButton.style.zIndex = "1000";
  toggleButton.style.backgroundColor = "#007bff";
  toggleButton.style.color = "#fff";
  toggleButton.style.border = "none";
  toggleButton.style.padding = "10px 15px";
  toggleButton.style.borderRadius = "5px";
  toggleButton.style.cursor = "pointer";
  toggleButton.style.fontSize = "14px";

  document.body.appendChild(toggleButton);

  // Toggle button functionality
  toggleButton.addEventListener("click", () => {
    mode = mode === "caption" ? "story" : "caption";
    toggleButton.innerText = `Mode: ${mode}`;
  });

  // Create a tooltip to display the result
  const tooltip = document.createElement("div");
  tooltip.style.position = "absolute";
  tooltip.style.backgroundColor = "#fff";
  tooltip.style.color = "#000";
  tooltip.style.border = "1px solid #ddd";
  tooltip.style.padding = "10px";
  tooltip.style.borderRadius = "5px";
  tooltip.style.boxShadow = "0px 4px 6px rgba(0, 0, 0, 0.1)";
  tooltip.style.zIndex = "999";
  tooltip.style.display = "none";
  tooltip.style.fontSize = "14px";
  tooltip.style.maxWidth = "300px";

  document.body.appendChild(tooltip);

  // Function to fetch caption or story from backend
  async function fetchResult(imgSrc) {
    try {
      const formData = new FormData();
      formData.append("image_url", imgSrc); // Send the image URL
      formData.append("mode", mode); // Send the selected mode

      const response = await fetch(apiUrl, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Backend returned status ${response.status}`);
      }

      const data = await response.json();
      return data.result; // Return the generated caption or story
    } catch (error) {
      console.error("Error fetching from backend:", error);
      return "Error generating text";
    }
  }

  // Add hover listeners to all images on the page
  document.addEventListener("mouseover", (event) => {
    if (event.target.tagName === "IMG") {
      const img = event.target;
      const imgSrc = img.src; // Get the image URL

      // Cancel any previous timeout if the user quickly moves the mouse
      clearTimeout(hoverTimer);

      // Start a new timeout to capture the input after hover delay
      hoverTimer = setTimeout(async () => {
        currentImage = img;
        // Show tooltip with loading text
        tooltip.style.display = "block";
        tooltip.innerText = "Loading...";
        tooltip.style.left = `${event.pageX + 10}px`;
        tooltip.style.top = `${event.pageY + 10}px`;

        // Fetch result from backend
        const result = await fetchResult(imgSrc);
        tooltip.innerText = result;
      }, hoverDelay);
    }
  });

  // Update tooltip position as the mouse moves
  document.addEventListener("mousemove", (event) => {
    if (tooltip.style.display === "block") {
      tooltip.style.left = `${event.pageX + 10}px`;
      tooltip.style.top = `${event.pageY + 10}px`;
    }
  });

  // Hide tooltip and clear hover timer if the mouse leaves the image
  document.addEventListener("mouseout", (event) => {
    if (event.target.tagName === "IMG") {
      tooltip.style.display = "none";
      clearTimeout(hoverTimer); // Cancel the input capture if the user moves the mouse away
    }
  });
})();
