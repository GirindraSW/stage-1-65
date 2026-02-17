(function () {
  function bindImagePicker(fileInputId, fileNameId) {
    const fileInput = document.getElementById(fileInputId);
    const fileNameEl = document.getElementById(fileNameId);

    if (!fileInput || !fileNameEl) return;

    fileInput.addEventListener("change", function () {
      const file = fileInput.files && fileInput.files[0];
      if (!file) {
        fileNameEl.textContent = "No file chosen";
        return;
      }

      fileNameEl.textContent = file.name;
    });
  }

  bindImagePicker("inputImage", "imageFileName");
  bindImagePicker("inputImageEdit", "imageFileNameEdit");
})();
