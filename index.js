const API = require("./built/API").default;
const api = new API({ headless: false });
api.get("https://www.justlightnovels.com/").then((data) => {
    console.log(data.data);
})