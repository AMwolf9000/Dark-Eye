// async function for await execution
( async () => {
    // keys to get from storage
    const keys = [
        "isActive",
        "colorThreshold",
        "colorGoalThreshold",
        "luminanceThreshold",
        "imageBrightness",
        "blacklist"
    ];
    // set values from storage as variables and set them to default if stored data is not found
    let [
        isActive = false,
        thresh1 = 50,
        thresh2 = 382,
        thresh3 = 0.5,
        thresh4 = 1,
        blacklist = ""
    ] = await new Promise((resolve) => {
        chrome.storage.local.get(keys, (result) => {
            const values = keys.map(key => result[key]);
            resolve(values);
        });
    });

    // get current hostname
    const [tab] = await chrome.tabs.query({active: true});
    const url = new URL(tab.url);
    const host = url.host || null;

    // check if current site is in blacklist
    let isBlacklist = false;
    if (host && blacklist.includes(host)) {
        isBlacklist = !isBlacklist;
    }

    // get elements
    const [
        bt1,
        bt2,
        bt3,
        label1,
        label2,
        label3,
        label4,
        input1,
        input2,
        input3,
        input4
    ] = [
        document.getElementById("startButton"),
        document.getElementById("resetPrefs"),
        document.getElementById("blacklistbt"),
        document.getElementById("colorThreshold"),
        document.getElementById("colorGoalThreshold"),
        document.getElementById("luminanceThreshold"),
        document.getElementById("imageBrightness"),
        document.getElementById("colorThreshold").nextElementSibling,
        document.getElementById("colorGoalThreshold").nextElementSibling,
        document.getElementById("luminanceThreshold").nextElementSibling,
        document.getElementById("imageBrightness").nextElementSibling
    ];

    // set up intial values
    function intialSetup() {
        const labels = [label1, label2, label3, label4];
        const inputs = [input1, input2, input3, input4];
        const values = [thresh1, thresh2, thresh3, thresh4];

        // set up bt1
        bt1.innerHTML = isActive ? "Deactivate" : "Activate";

        // set up bt3
        if (isBlacklist) {
            bt3.innerHTML = "whitelist site";
        }

        // set up labels and inputs
        for (let i = 0; i < 4; ++i) {
            const [label, input, val] = [labels[i], inputs[i], values[i]];

            label.innerHTML = label.innerHTML + val;
            input.value = val;
        }
    }
    intialSetup();

    // set up functions to execute on changing of the inputs
    [input1, input2, input3, input4]
    .forEach((input) => {
        input.oninput = () => update(input.previousElementSibling, input.value);
    });

    // updates visuals and storage of label data
    function update(label, val){
        // set visual
        label.innerHTML = label.innerHTML.split(":")[0] + ": " + val;

        // set object to put into storage
        const obj = {};
        obj[label.id] = val;
    
        // put object into storage
        chrome.storage.local.set(obj);
    };

    // set up buttons
    bt1.addEventListener("click", () => {
        // reverse state
        isActive = !isActive;

        // change visual
        bt1.innerHTML = isActive ? "Deactivate" : "Activate";

        // put state into storage
        chrome.storage.local.set({isActive: isActive});
    });
    bt2.addEventListener("click", () => {
        // reset all slider visuals and values
        chrome.storage.local.set({colorThreshold: 50});
        chrome.storage.local.set({colorGoalThreshold: 382});
        chrome.storage.local.set({luminanceThreshold: 0.5});
        chrome.storage.local.set({imageDarkness: 1});

        label1.innerHTML = label1.innerHTML.split(":")[0] + ": " + 50;
        label2.innerHTML = label2.innerHTML.split(":")[0] + ": " + 382;
        label3.innerHTML = label3.innerHTML.split(":")[0] + ": " + 0.5;
        label4.innerHTML = label4.innerHTML.split(":")[0] + ": " + 1;

        input1.value = 50;
        input2.value = 382;
        input3.value = 0.5;
        input4.value = 1;
    });
    bt3.addEventListener("click", () => {
        // if the host cannot be defined, return
        if (!host) return;

        if (isBlacklist) {
            // change isBlacklist state
            isBlacklist = !isBlacklist;

            // change visual
            bt3.innerHTML = "blacklist site";

            // take site out of blacklist
            blacklist = blacklist.replace(host + ",", "");

            // save to storage
            chrome.storage.local.set({blacklist: blacklist});
        } else {
            // change isBlacklist state
            isBlacklist = !isBlacklist;

            // change visual
            bt3.innerHTML = "whitelist site";

            // put site in blacklist
            blacklist += host + ",";

            // save to storage
            chrome.storage.local.set({blacklist: blacklist});
        }
    })
})()