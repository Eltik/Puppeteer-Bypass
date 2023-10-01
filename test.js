const { API } = require("./built");
const api = new API({ headless: false });
console.log("Fetching site justlightnovels.com...");
api.request("https://www.justlightnovels.com/").then((data) => {
    console.log("Successfully fetched cookies! Now sending a request with the cookies...");
    api.request("https://www.justlightnovels.com/").then((data) => {
        console.log("Successfully sent request with stored cookies!");
        api.close().then(() => {
            console.log("Successfully closed browser!");
        })
    });
})