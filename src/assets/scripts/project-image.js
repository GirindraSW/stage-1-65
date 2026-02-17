(function () {
  function bindImagePicker(fileInputId, hiddenInputId, fileNameId) {
    const fileInput = document.getElementById(fileInputId);
    const hiddenInput = document.getElementById(hiddenInputId);
    const fileNameEl = document.getElementById(fileNameId);

    if (!fileInput || !hiddenInput || !fileNameEl) return;

    fileInput.addEventListener("change", function () {
      const file = fileInput.files && fileInput.files[0];
      if (!file) {
        fileNameEl.textContent = "No file chosen";
        return;
      }

      fileNameEl.textContent = file.name;
      const reader = new FileReader();
      reader.onload = function (event) {
        hiddenInput.value = String(event.target?.result || "");
      };
      reader.readAsDataURL(file);
    });
  }

  bindImagePicker("inputImage", "imageData", "imageFileName");
  bindImagePicker("inputImageEdit", "imageDataEdit", "imageFileNameEdit");
})();
