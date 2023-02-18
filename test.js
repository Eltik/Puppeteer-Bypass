const API = require("./built/API").default;
const api = new API({ headless: false });
console.log("Fetching site justlightnovels.com...");
api.request("https://www.justlightnovels.com/").then((data) => {
    console.log("Successfully fetched cookies! Now sending a request with the cookies...");
    api.request("https://www.justlightnovels.com/").then((data) => {
        console.log("Successfully sent request with stored cookies!");
    });
})