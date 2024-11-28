( async () => {
    let isActive = await chrome.storage.local.get(["isActive"]).then(result => result.isActive ?? false);
    const button = document.getElementById("toggleButton");

    switchUI(isActive);

    button.addEventListener("click", () => {
        isActive = !isActive;
        switchUI(isActive);
        chrome.storage.local.set({isActive: isActive});
    });

    function switchUI(state) {
        if (state) {
            button.innerText = "Deactivate";
        } else {
            button.innerText = "Activate";
        }
    }
})()