# Puppeteer-Bypass
Bypassing CloudFlare's anti-bot challenge with a new optimized method.

## Background
Bypassing CloudFlare isn't anything new, and neither is bypassing it with headless browsers. However, after seeing some outdated repositories such as [FlareSolverr](https://github.com/FlareSolverr/FlareSolverr) and [Pupflare](https://github.com/unixfox/pupflare), I wondered if it would be possible to update those repositories but in an optimized and less resource-intensive way. Long story short, I found [this](https://github.com/JimmyLaurent/cloudflare-scraper) and tried it out. It didn't work very well unfortunately and errored out on quite a few sites, but after tweaking it (issue with cookies by the way, if anyone wants to try using JimmyLaurent's repository specifically) I got it working on every single site. But since headless browsers are just not viable for production, I decided to try and "cache" each response and store the bypass headers in the object for use later. Anyways, that's kind of how this repository works: fetching cookies, storing them, and then re-using them until it breaks before finally repeating the process over again.

## Installation
Puppeteer-Bypass requires Node version 18 (untested, v19+ doesn't work however) and `chromium-browser` on Linux.
1. Clone this repository.
```bash
git clone https://github.com/Eltik/Puppeteer-Bypass.git
```
2. Run `npm i`.
3. If necessary, download [Google Chrome](https://www.google.com/chrome/) (this version uses Chromium which comes with Google Chrome, but you can create a pull request/fork to use Firefox/Edge).
4. To test out the project, run `npm run test` to send a request to [JustLightNovels](https://www.justlightnovels.com/) which as of now (2/17/2023) has CloudFlare's "Under Attack Mode" on.<br />

For installing this on Linux, make sure you have Chromium and VNC/xorg installed. The reason for this is that this bypass will NOT work with a proper window/GUI application installed. The below will show you how to install VNC server for Linux specifically as that's what I used to get this working on my VPS. You can follow [this tutorial](https://learn.microsoft.com/en-us/azure/virtual-machines/linux/use-remote-desktop?tabs=azure-cli) to help install a GUI for Linux if you're using Windows. The following will show you some basic stuff that I recommend personally for installing a custom GUI.
```bash
# Install Chromium Browser
sudo apt-get install chromium-browser

# Install a literal desktop lol
sudo apt install xfce4 xfce4-goodies

# Install XRDP
sudo apt-get -y install xvfb

# If you get errors regarding missing libraries, run this:
sudo apt-get update
sudo apt-get install ca-certificates fonts-liberation libappindicator3-1 libasound2 libatk-bridge2.0-0 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgbm1 libgcc1 libglib2.0-0 libgtk-3-0 libnspr4 libnss3 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 lsb-release wget xdg-utils
```
If you are following the Azure tutorial, please note that since Windows supports the "Remote Desktop Connection" app and MacOS doesn't have one natively, well if you're using Mac then I'm sorry. MacOS is trash. And I use a Mac. Yeah.
## Using as a "Library"
I'm sure people want to use this project as a library, but just be aware that headless browsers use up a <b>LOT</b> of memory and CPU power. Luckily, this project is meant to avoid the use of headless browsers as much as possible, but it is something to keep in mind. It is recommended that you use a higher-end VPS or hoster with at least 4GB of memory if not more.

### Initalizing the Constructor
```javascript
// ES6
import API from "./built/API"

// If you hate the fact that I named the main class API, you can change it lol
import * as PuppeteerBypaass from "./built/API"

// CommonJS
const API = require("./built/API").default;

const bypass = new API();

// These are the default values for the constructor. Change it as you see fit.
// It is recommended you keep all the default values, but they're there if you need to change them.
// { headless } is the option of whether you want to launch Puppeteer in headless mode or not.
// { skip_chromium_download } is the option of whether you want to skip downloading Chromium or not.
const bypass2 = new API({ headless: true, skip_chromium_download: false });
```

### Sending Requests
```javascript
import API from "./buil/API"
const bypass = new API();
// The second parameter is just the default axios config. Use it as if you're using axios
await bypass.request("https://myprotectedsite.com", { method: "PUT",
    headers: {
        Referer: "https://myprotectedsite.com",
        "User-Agent": "randomuseragent", // PLEASE NOTE THAT THIS WILL GET OVERWRITTEN
        Cookie: "value1=lol;value2=something", // THIS ALSO WILL GET OVERWRITTEN
        "X-Requested-With": "XMLHttpRequest",
        "Content-Type": "applicatipn/json",
        Accept: "application/json"
    }
})
```